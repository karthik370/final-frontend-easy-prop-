// UUID polyfill for React Native
// This provides a basic implementation of UUID for platforms that don't natively support it

// Simple UUID v4 implementation
export function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Adds the uuid function to the global scope if it doesn't exist
if (!global.uuid) {
  global.uuid = {
    v4: uuidv4
  };
}

export default {
  v4: uuidv4
};
