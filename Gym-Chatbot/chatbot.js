class ChatBot {
  constructor(intentFilePath) {
    const fs = require('fs')
    const data = fs.readFileSync(intentFilePath, 'utf-8')
    this.intents = JSON.parse(data).intents
    this.state = 'start'
    this.fallbackCount = 0
    this.planData = {}
  }

  async init() {}

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
      return 'Hey Buddy! Möchtest du einen Trainingsplan erstellen oder Fragen zum Thema Fitness stellen?'
    }

    const planIntent = this.findIntent(text) === 'Trainingsplan'

    if (this.state === 'fragen_flow' && planIntent) {
      this.state = 'plan_ask_frequency'
      this.planData = {}
      return 'Okay! Wie oft pro Woche möchtest du trainieren?'
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
        this.planData = {}
        return 'Wie oft pro Woche möchtest du trainieren? (z.B. 3)'
      }

      if (intent === 'Fragen') {
        this.state = 'fragen_flow'
        this.fallbackCount = 0
        return 'Stelle mir deine Frage zum Thema Fitness.'
      }

      this.fallbackCount++
      if (this.fallbackCount >= 3) {
        this.state = 'start'
        this.fallbackCount = 0
        return 'Ich verstehe dich leider nicht. Lass uns von vorne anfangen. Möchtest du einen Trainingsplan erstellen oder Fragen stellen?'
      }

      return 'Bitte antworte mit "Trainingsplan" oder "Fragen".'
    }

    if (this.state.startsWith('plan_')) {
      return this.handlePlanFlow(text)
    }

    if (this.state === 'fragen_flow') {
      const intent = this.findIntent(text)
      const found = this.intents.find(i => i.name === intent)
      if (found && found.answers.length > 0 && intent !== 'Fallback') {
        return found.answers[0]
      } else {
        return 'Das habe ich nicht verstanden. Kannst du es anders formulieren?'
      }
    }

    return 'Sorry, da ist etwas schiefgelaufen.'
  }

  handlePlanFlow(text) {
    switch (this.state) {
      case 'plan_ask_frequency':
        const freq = parseInt(text)
        if (isNaN(freq) || freq < 1 || freq > 7) {
          return 'Bitte gib eine Zahl zwischen 1 und 7 an.'
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
          return 'Bitte gib "leicht", "mittel" oder "hart" an.'
        }
        this.planData.intensity = text
        this.planData.days = []
        this.currentDay = 1
        this.state = 'plan_ask_bodypart'
        return `Für Tag ${this.currentDay} - welche Körpergruppen möchtest du trainieren? (z. B. Brust, Beine )`

      case 'plan_ask_bodypart':
        const parts = text.split(',').map(p => p.trim().toLowerCase())
        const valid = ['beine', 'brust', 'rücken', 'bauch', 'bizeps', 'trizeps', 'schultern']
        if (!parts.every(p => valid.includes(p))) {
          return `Bitte gib gültige Körpergruppen an (durch Komma getrennt): ${valid.join(', ')}`
        }

        this.planData.days.push({ day: this.currentDay, bodyparts: parts })

        if (this.currentDay < this.planData.frequency) {
          this.currentDay++
          return `Für Tag ${this.currentDay} - welche Körpergruppen möchtest du trainieren?`
        } else {
          this.state = 'plan_complete'
          return this.generatePlan()
        }

      case 'plan_complete':
        if (['ja', 'neu', 'ändern'].includes(text)) {
          this.state = 'plan_ask_frequency'
          this.planData = {}
          return 'Wie oft pro Woche möchtest du trainieren?'
        }
        if (['nein', 'fertig', 'stop', 'ende'].includes(text)) {
          this.state = 'start'
          this.planData = {}
          return 'Alles klar. Sag Bescheid, wenn du wieder starten willst.'
        }
        return 'Möchtest du den Plan ändern? Antworte mit "ja" oder "nein".'

      default:
        this.state = 'start'
        return 'Da ist etwas schiefgelaufen. Lass uns neu anfangen.'
    }
  }

  generatePlan() {
    const { frequency, duration, intensity, days } = this.planData
    const messages = []

    messages.push(`Dein Trainingsplan für ${frequency} Tage/Woche, ${duration} Minuten pro Einheit, Intensität: ${intensity}.`)

    for (const day of days) {
      let block = `\nTag ${day.day} (${day.bodyparts.join(', ')}):\n`
      for (const part of day.bodyparts) {
        const exercises = this.getExercisesFor(part, intensity)
        block += `  ${this.capitalize(part)}:\n    ${exercises.join('\n    ')}\n`
      }
      messages.push(block)
    }

    messages.push('Möchtest du den Plan ändern? Antworte mit "ja" oder "nein".')
    return messages
  }

  getExercisesFor(bodypart, intensity) {
    const plans = {
      beine: {
        leicht: ['Beinheben', 'Wandsitzen'],
        mittel: ['Kniebeugen', 'Ausfallschritte'],
        hart: ['Beinpresse', 'Bulgarian Split Squats', 'Jump Squats']
      },
      brust: {
        leicht: ['Armheben', 'Wand-Liegestütze'],
        mittel: ['Liegestütze', 'Kurzhantelfliegen'],
        hart: ['Bankdrücken', 'Dips', 'Negativ-Liegestütze']
      },
      rücken: {
        leicht: ['Superman', 'Bird-Dog'],
        mittel: ['Rudern mit Band', 'Kreuzheben leicht'],
        hart: ['Klimmzüge', 'Langhantel-Rudern', 'Kreuzheben schwer']
      },
      bauch: {
        leicht: ['Crunches', 'Beinheben'],
        mittel: ['Planks', 'Russian Twists'],
        hart: ['Dragon Flags', 'Weighted Sit-Ups', 'Hanging Leg Raises']
      },
      arme: {
        leicht: ['Bizeps-Curls mit Wasserflaschen', 'Trizeps-Strecken ohne Gewicht'],
        mittel: ['Kurzhantel-Curls', 'Dips an der Bank'],
        hart: ['Langhantel-Curls', 'Enges Bankdrücken']
      },
      bizeps: {
        leicht: ['Wasserflaschen-Curls'],
        mittel: ['Kurzhantel-Curls'],
        hart: ['Langhantel-Curls', 'Konzentrationscurls']
      },
      trizeps: {
        leicht: ['Trizeps-Strecken ohne Gewicht'],
        mittel: ['Dips an Bank', 'Overhead-Extensions'],
        hart: ['Enges Bankdrücken', 'Trizepsdrücken am Kabelzug']
      },
      schultern: {
        leicht: ['Seitheben ohne Gewicht'],
        mittel: ['Seitheben mit Kurzhanteln', 'Frontheben'],
        hart: ['Schulterdrücken', 'Arnold Press', 'Push Press']
      }
    }

    return plans[bodypart]?.[intensity] || ['Allgemeines Training']
  }

  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }
}

module.exports = ChatBot
