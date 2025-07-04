class ChatBot {
  constructor(intentFilePath) {
    const fs = require('fs')
    const data = fs.readFileSync(intentFilePath, 'utf-8')
    this.intents = JSON.parse(data).intents
    this.state = 'start'
    this.fallbackCount = 0
    this.planData = {}
  }

  async init() {
    // Platzhalter falls async Initialisierung benötigt wird
  }

  findIntent(input) {
    const text = input.toLowerCase()
    for (const intent of this.intents) {
      if (intent.keywords.some(k => text.includes(k))) {
        return intent.name
      }
    }
    return 'Fallback'
  }

  async processInput(input) {
    const text = input.trim().toLowerCase()

    if (text === '') {
      this.state = 'waiting_for_choice'
      return 'Willkommen! Möchtest du einen Trainingsplan erstellen oder Fragen stellen?'
    }

    if (this.state === 'start') {
      this.state = 'waiting_for_choice'
      return 'Möchtest du einen Trainingsplan erstellen oder Fragen stellen?'
    }

    if (this.state === 'waiting_for_choice') {
      const intent = this.findIntent(text)

      if (intent === 'Trainingsplan') {
        this.state = 'plan_ask_frequency'
        this.fallbackCount = 0
        this.planData = {} // Reset Plan-Daten
        return 'Wie oft pro Woche möchtest du trainieren? (z.B. 3)'
      }

      if (intent === 'Fragen') {
        this.state = 'fragen_flow'
        this.fallbackCount = 0
        return 'Stelle mir deine Frage zum Training.'
      }

      this.fallbackCount++
      if (this.fallbackCount >= 3) {
        this.state = 'start'
        this.fallbackCount = 0
        return 'Ich verstehe dich leider nicht. Lass uns von vorne anfangen. Möchtest du einen Trainingsplan erstellen oder Fragen stellen?'
      }
      return 'Bitte antworte mit "Trainingsplan" oder "Fragen".'
    }

    // Trainingsplan flow mit Fragen zur Häufigkeit, Dauer, Intensität, Körpergruppen
    if (this.state.startsWith('plan_')) {
      return this.handlePlanFlow(text)
    }

    if (this.state === 'fragen_flow') {
      // Intents anhand Keywords erkennen und Antworten geben
      const intent = this.findIntent(text)
      const foundIntent = this.intents.find(i => i.name === intent)
      if (foundIntent && foundIntent.answers.length > 0 && intent !== 'Fallback') {
        return foundIntent.answers[0]
      } else {
        return 'Das habe ich leider nicht verstanden. Kannst du deine Frage anders formulieren?'
      }
    }

    return 'Entschuldige, da ist etwas schiefgelaufen.'
  }

  handlePlanFlow(text) {
    switch(this.state) {
      case 'plan_ask_frequency':
        const freq = parseInt(text)
        if (isNaN(freq) || freq < 1 || freq > 7) {
          return 'Bitte gib eine Zahl zwischen 1 und 7 für die Trainingstage pro Woche ein.'
        }
        this.planData.frequency = freq
        this.state = 'plan_ask_duration'
        return 'Wie lange möchtest du pro Trainingseinheit trainieren? (in Minuten)'

      case 'plan_ask_duration':
        const dur = parseInt(text)
        if (isNaN(dur) || dur < 10 || dur > 180) {
          return 'Bitte gib eine sinnvolle Trainingsdauer in Minuten an (zwischen 10 und 180).'
        }
        this.planData.duration = dur
        this.state = 'plan_ask_intensity'
        return 'Wie intensiv möchtest du trainieren? (leicht, mittel, hart)'

      case 'plan_ask_intensity':
        if (!['leicht', 'mittel', 'hart'].includes(text)) {
          return 'Bitte gib "leicht", "mittel" oder "hart" als Intensität an.'
        }
        this.planData.intensity = text
        this.planData.days = []
        this.currentDay = 1
        this.state = 'plan_ask_bodypart'
        return `Für Tag ${this.currentDay} - Welche Körpergruppe möchtest du trainieren? (z.B. Beine, Brust, Rücken, Bauch)`

      case 'plan_ask_bodypart':
        const validBodyparts = ['beine', 'brust', 'rücken', 'bauch']
        if (!validBodyparts.includes(text)) {
          return `Bitte gib eine gültige Körpergruppe an: ${validBodyparts.join(', ')}`
        }
        this.planData.days.push({ day: this.currentDay, bodypart: text })

        if (this.currentDay < this.planData.frequency) {
          this.currentDay++
          return `Für Tag ${this.currentDay} - Welche Körpergruppe möchtest du trainieren?`
        } else {
          this.state = 'plan_complete'
          return this.generatePlan()
        }

      case 'plan_complete':
        // Nach Plan-Ausgabe fragen ob neu starten oder beenden
        if (['ja', 'neu', 'ändern', 'ändern'].includes(text)) {
          this.state = 'plan_ask_frequency'
          this.planData = {}
          return 'Wie oft pro Woche möchtest du trainieren?'
        } 
        if (['nein', 'fertig', 'stop', 'ende'].includes(text)) {
          this.state = 'start'
          this.planData = {}
          return 'Alles klar, wenn du wieder einen Plan möchtest oder Fragen hast, sag Bescheid!'
        }
        return 'Möchtest du den Plan ändern? Antworte mit "ja" für neu erstellen oder "nein" zum Beenden.'

      default:
        this.state = 'start'
        return 'Da ist etwas schiefgelaufen. Lass uns von vorne beginnen. Möchtest du einen Trainingsplan erstellen oder Fragen stellen?'
    }
  }

  generatePlan() {
    const { frequency, duration, intensity, days } = this.planData
    let planText = `Dein Trainingsplan für ${frequency} Tage pro Woche, ${duration} Minuten pro Einheit, Intensität: ${intensity}.\n\n`

    for (const day of days) {
      let exercises = ''
      switch(day.bodypart) {
        case 'beine':
          exercises = 'Kniebeugen, Ausfallschritte, Beinpresse'
          break
        case 'brust':
          exercises = 'Bankdrücken, Liegestütze, Kurzhantelfliegen'
          break
        case 'rücken':
          exercises = 'Rudern, Kreuzheben, Klimmzüge'
          break
        case 'bauch':
          exercises = 'Planks, Crunches, Leg Raises'
          break
        default:
          exercises = 'Allgemeines Ganzkörpertraining'
      }
      planText += `Tag ${day.day} (${day.bodypart}): ${exercises}\n`
    }

    planText += '\nMöchtest du den Plan ändern? Antworte mit "ja" für neu erstellen oder "nein" zum Beenden.'

    return planText
  }
}

module.exports = ChatBot
