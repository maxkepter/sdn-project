const environment = require("../config/environment");

let current = 0;

const getBackend = () => {
  const target = environment.backends[current % environment.backends.length];
  current += 1;
  return target;
};

module.exports = { getBackend };
