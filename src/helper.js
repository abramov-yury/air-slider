export const createElement = (tag, cls, dataAttr) => {
  const element = document.createElement(tag);
  if(cls) element.className = cls;
  if (dataAttr instanceof Array && dataAttr.length === 2) {
    element.setAttribute("data-" + dataAttr[0], dataAttr[1]);
  }
  return element;
};

export const prepareArrayValues = (config) => {
  let values = [];
  let range = config.values.max - config.values.min;

  if(!config.step) {
    return false;
  }

  const length = range / config.step;

  for(let i = 0; i < length; i++) {
    values.push(config.values.min + i * config.step);
  }

  if(values.indexOf(config.values.max) === -1) {
    values.push(config.values.max);
  }

  return values;
};

export const checkInitial = (config) => {
  if(!(config.start instanceof Array) || !config.start || config.start.length < 1) return null;
  if(config.values.indexOf(config.start[0]) === -1) return null;
  return true;
};

export const createOnDocumentEvents = (obj, events, callback) => {
  const arr = events.split(", ");
  arr.forEach((item) => {
    obj[item] = callback;
    document.addEventListener(item, obj[item]);
  });
};

export const removeOnDocumentEvents = (obj, events) => {
  const arr = events.split(", ");
  arr.forEach((item) => {
    document.removeEventListener(item, obj[item]);
  });
};

export const debounce = (callback, delay) => {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      callback.apply(this, args);
    }, delay);
  };
};
