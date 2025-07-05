const fs = require('fs');
const { io } = require('socket.io-client');

class bot {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.sender = '';
    this.userState = {};

    try {
      const data = fs.readFileSync('antworten.json', 'utf-8');
      this.dict = JSON.parse(data);
      console.log('Antworten erfolgreich geladen.');
    } catch (err) {
      console.error('Fehler beim Laden der Antworten:', err);
      this.dict = [];
    }
  }

  connect() {
    if (this.connected) return;

    this.socket = io('http://localhost:8081');

    this.socket.on('connect', () => {
      this.connected = true;
      console.log('Bot connected via Socket.IO');

      this.socket.emit('join', { name: 'Rick' });

      const welcome = 'Hallo! Frag mich etwas über Zellorganellen!';
      const msg = {
        type: 'msg',
        name: 'Rick',
        msg: welcome,
        sender: 'Rick'
      };
      this.socket.emit('msg', msg);
    });

    this.socket.on('message', (data) => {
      if (!data || !data.name || !data.msg) {
        console.error('Ungültige Nachricht empfangen:', data);
        return;
      }

      if (data.name !== 'Rick') {
        console.log(`Received from ${data.name}: ${data.msg}`);
        this.sender = data.name;
        this.post(JSON.stringify(data));
      }
    });

    this.socket.on('disconnect', () => {
      this.connected = false;
      console.log('Bot disconnected from server');
    });

    this.socket.on('connect_error', (err) => {
      console.error('Connection error:', err.message);
    });
  }

  post(msg) {
    
    if (this.userState[this.sender]?.hardFallback) {
      if (msg === "Restart") {
        this.socket.disconnect();
        this.connected = false;
        this.connect();
      }else{
      this.sendAntwort("Bitte nutze den Link, den ich dir gegeben habe.");
      return;
 }
}

    const get = JSON.parse(msg);
    if (!get.msg || typeof get.msg !== 'string') return;

    this.sender = get.name;
    const nachricht = get.msg.toLowerCase().replace(/[.,?!]/g, '').trim();

    if (!this.userState[this.sender]) {
      this.userState[this.sender] = {
        contextStack: [],
        lastIntent: null,
        lastMsg: null,
        lastsentIntent: null,
        repeatedIntentCount: 0
      };
    }

    const state = this.userState[this.sender];

    if (state.lastMsg === nachricht) {
      console.log(`Ignoriere doppelte Nachricht von ${this.sender}: "${nachricht}"`);
        state.repeatedIntentCount = (state.repeatedIntentCount || 0) + 1;
        if (state.repeatedIntentCount === 1){
          this.sendAntwort("Es scheint so als hättest du die nachricht gerade schon abgeschickt")
          }else if (state.repeatedIntentCount === 2) {
            this.sendAntwort("Es scheint so als hättest du die nachricht schon zweimal abgeschickt")
          }else if (state.repeatedIntentCount === 3){
            this.sendAntwort("Es scheint so als hättest du die nachricht schon dreimal abgeschickt")
          }else if (state.repeatedIntentCount > 3){
            state.hardFallback = true; 
            this.sendAntwort("es scheint so als gäbe eins ein problem aber du kannst dich gerne selber mit über Zellorganissmen informieren. Link: [...] oder tippe Restart um den Chatroom neu zu starten ")
            return true;
      }
      return;
    }

    state.lastMsg = nachricht;

    if (state.contextStack.length > 0) {
      if (this.handleFollowUp(nachricht)) return;
    } else {
      if (this.handleNewIntent(nachricht)) return;
    }
  }

  handleFollowUp(nachricht) {
    const state = this.userState[this.sender];
    const lastIntent = state.contextStack.slice(-1)[0];
    const eintrag = this.dict.find(e => e.intent === lastIntent);

    if (['ja', 'yes', 'klar', 'okay', 'ok'].some(w => nachricht.includes(w))) {
      const inhalt = this.getDetailForIntent(lastIntent);
      state.contextStack = [];
      state.lastIntent = null;
      this.sendAntwort(inhalt);
      return true;
    } else if (['nein', 'no', 'nicht'].some(w => nachricht.includes(w))) {
      const inhalt = "Alles klar, frag mich gerne etwas anderes über Zellorganellen!";
      state.contextStack = [];
      state.lastIntent = null;
      this.sendAntwort(inhalt);
      return true;
    } else {
      this.sendAntwort("Bitte antworte mit Ja oder Nein.");
      return true;
    }
  }

  handleNewIntent(nachricht) {
    let maxTreffer = 0;
    let besteKategorie = null;
    const state = this.userState[this.sender];

    for (let eintrag of this.dict) {
      let treffer = 0;
      for (let key of eintrag.keywords) {
        if (nachricht.includes(key)) treffer++;
      }
      if (treffer > maxTreffer) {
        maxTreffer = treffer;
        besteKategorie = eintrag;
      }
    }

    let inhalt = 'Ich verstehe nicht genau, worum es geht. Frag mich etwas über Zellorganellen.';

    if (maxTreffer > 0 && besteKategorie) {

      inhalt = besteKategorie.antwort;
      state.lastIntent = besteKategorie.intent;
      state.contextStack.push(besteKategorie.intent);

      if (besteKategorie.followUps && besteKategorie.followUps.frage) {
        inhalt += " " + besteKategorie.followUps.frage;
      } else {
        state.contextStack = [];
        state.lastIntent = null;
      }

    } else if (state.lastIntent) {
      inhalt = `Meinst du noch etwas zu: ${state.lastIntent}? Bitte antworte mit Ja oder Nein.`;
      state.contextStack.push(state.lastIntent);
    }

    this.sendAntwort(inhalt);
    return true;
  }

  sendAntwort(message) {
    if (!this.socket || !this.connected) {
      console.log("Keine WebSocket-Verbindung.");
      return;
    }

    const state = this.userState[this.sender]
    if (!state.lastsentmessage) state.lastsentmessage = []

    state.lastsentmessage.push(message)

    if (state.lastsentmessage.length > 3) {
      state.lastsentmessage.shift()
  }

  const loop =
    state.lastsentmessage.length === 3 &&
    state.lastsentmessage.every((m, _, arr) => m === arr[0])

  if (loop) {
    console.log("Loop erkannt – aktiviere Neustart")
    state.hardFallback = true
    this.sendAntwort("es scheint so als gäbe eins ein problem aber du kannst dich gerne selber mit über Zellorganissmen informieren. Link: [...] oder tippe Restart um den Chatroom neu zu starten ")
  }else {

    const antwort = {
      type: 'msg',
      name: 'Rick',
      msg: message,
      sender: this.sender
    };

    console.log("Send: " + JSON.stringify(antwort));
    this.socket.emit('msg', antwort);
  }
}

  getDetailForIntent(nachricht) {

    const state = this.userState[this.sender];
    let maxTreffer = 0;
    let besteKategorie = null;

    for (let eintrag of this.dict) {
      let treffer = 0;
      for (let key of eintrag.keywords) {
        if (nachricht && nachricht.includes(key)) treffer++;
      }
      if (treffer > maxTreffer) {
        maxTreffer = treffer;
        besteKategorie = eintrag;
      }
    }
    if (maxTreffer > 0 && besteKategorie) {
      if (besteKategorie.followUps && besteKategorie.followUps.detail) {
        return besteKategorie.followUps.detail;
      } else {
        state.contextStack = [];
        state.lastIntent = null;
        return "Ich hab dazu leider keine weiteren Details";
      }
    }else{
      return "Ich hab dazu leider keine weiteren Details";
    }
   }
}

module.exports = bot;
