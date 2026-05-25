const EventEmitter = require('events');

class ThoughtEmitter {
  constructor() {
    this.eventEmitter = new EventEmitter();
    this.eventEmitter.setMaxListeners(50);
  }

  emit(type, data) {
    this.eventEmitter.emit('thought', { type, data, timestamp: new Date().toISOString() });
  }

  subscribe(callback) {
    this.eventEmitter.on('thought', callback);
  }

  unsubscribe(callback) {
    this.eventEmitter.off('thought', callback);
  }
}

// Use globalThis to ensure a SINGLE instance across all Next.js routes
// (Next.js App Router compiles each route independently, so module-level
// singletons get recreated per route. globalThis survives across routes.)
const GLOBAL_KEY = '__pipeline_pilot_thought_emitter__';
if (!globalThis[GLOBAL_KEY]) {
  globalThis[GLOBAL_KEY] = new ThoughtEmitter();
}

module.exports = globalThis[GLOBAL_KEY];
