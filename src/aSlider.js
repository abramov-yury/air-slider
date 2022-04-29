import {
  checkInitial,
  createElement,
  createOnDocumentEvents,
  prepareArrayValues,
  removeOnDocumentEvents
} from "./helper.js";

export class AS {
  constructor(config) {
    this.activePointer = null;
    this.connection = null;
    this.piece = null;
    this.input = null;
    this.inputDisplay = null;
    this.keyStep = null;
    this.lane = null;
    this.leftPointer = null;
    this.min = null;
    this.max = null;
    this.rightPointer = null;
    this.pointers = null;
    this.pointerWidth = null;
    this.shift = null;
    this.slider = null;
    this.sliderLeft = null;
    this.sliderWidth = null;
    this.timer = null;

    this.values = {
      start:	null,
      end:	null,
    };

    this.Arrow = {left : "ArrowLeft", right: "ArrowRight"};

    this.theDocumentEvents = {};

    this.config = {
      disabled:	false,
      keyStep: 1,
      onChange: null,
      start: null,
      step: 1,
      target: null,
      values: null,
    };

    for(let i in this.config) {
      if(Object.prototype.hasOwnProperty.call(config, i)) {
        this.config[i] = config[i];
      }
    }

    this.cls = {
      container: "AS",
      connection: "AS__connection",
      disabled: "AS--disabled",
      lane: "AS__lane",
      pointer: "AS__pointer",
      sliding: "AS--sliding",
    };

    this.destroy = this.destroy.bind(this);
    this.getValue = this.getValue.bind(this);

    this._initiate();
  }

  _initiate() {
    if(typeof this.config.target !== "object") {
      return console.log("Cannot find target element...");
    }

    this.input = this.config.target;

    this.inputDisplay = getComputedStyle(this.input).display;
    this.input.style.display = "none";

    if(typeof this.config.values !== "object" || !this.config.values) {
      return console.log("Object of the values not defined");
    }

    const thereAreValues = (
      Object.prototype.hasOwnProperty.call(this.config.values, "min")
      && Object.prototype.hasOwnProperty.call(this.config.values, "max")
    );

    if(!thereAreValues) {
      return console.log("Missing min or max value...");
    }

    return this._createSlider();
  }

  _createSlider() {
    this.slider = createElement("div", this.cls.container);
    this.lane = createElement("div", this.cls.lane);
    this.connection = createElement("div", this.cls.connection);
    this.leftPointer = createElement("div", this.cls.pointer, ["pointer", "left"]);
    this.rightPointer = createElement("div", this.cls.pointer, ["pointer", "right"]);

    this.slider.append(this.lane);
    this.slider.append(this.connection);
    this.slider.append(this.leftPointer);
    this.slider.append(this.rightPointer);

    this.input.parentNode.append(this.slider);

    this.sliderLeft = this.slider.getBoundingClientRect().left;
    this.sliderWidth = this.slider.clientWidth;
    this.pointerWidth = this.leftPointer.offsetWidth;

    this._setInitialValues();
  }

  _setInitialValues() {
    this.disable(this.config.disabled);

    this.min = this.config.values.min;
    this.max = this.config.values.max;

    this.config.values = prepareArrayValues(this.config);

    if(!this.config.values) {
      return console.log("No step defined...");
    }

    if(this.config.values.length < 2) {
      return console.log("Need to set the correct values...");
    }

    this.values.start = 0;
    this.values.end = this.config.values.length - 1;

    if(checkInitial(this.config)) {
      const start = this.config.start;
      this.values.start = this.config.values.indexOf(start[0]);
      if(this.config.start[1]) this.values.end = this.config.values.indexOf(start[1]);
    }

    this.pointers = this.slider.querySelectorAll(`.${this.cls.pointer}`);
    this.pointers.forEach((item) => {
      item.setAttribute("tabindex", "0");
      item.setAttribute("role", "slider");
      item.setAttribute("aria-orientation", "horizontal");
    });

    this._addEvents();
  }

  _setValues() {
    this.piece = this.sliderWidth / (this.config.values.length - 1);

    if(this.values.start >= this.values.end && this.activePointer === this.leftPointer) this.values.start = this.values.end;
    if(this.values.start >= this.values.end && this.activePointer === this.rightPointer) this.values.end = this.values.start;

    this.leftPointer.style.transform = `translateX(${(this.values.start * this.piece - this.pointerWidth / 2) }px)`;
    this.rightPointer.style.transform = `translateX(${(this.values.end * this.piece - this.pointerWidth / 2) }px)`;

    this.connection.style.width = `${(this.values.end - this.values.start) * this.piece}px`;
    this.connection.style.transform = `translateX(${this.values.start * this.piece}px)`;

    this.leftPointer.setAttribute("aria-label", "Левый бегунок"); //!
    this.leftPointer.setAttribute("aria-valuemin", this.min);
    this.leftPointer.setAttribute("aria-valuemax", this.config.values[this.values.end]);
    this.leftPointer.setAttribute("aria-valuenow", this.config.values[this.values.start]);
    this.leftPointer.setAttribute("aria-valuetext", this.config.values[this.values.start]);

    this.rightPointer.setAttribute("aria-label", "Правый бегунок"); //!
    this.rightPointer.setAttribute("aria-valuemin", this.config.values[this.values.start]);
    this.rightPointer.setAttribute("aria-valuemax", this.max);
    this.rightPointer.setAttribute("aria-valuenow", this.config.values[this.values.end]);
    this.rightPointer.setAttribute("aria-valuetext", this.config.values[this.values.end]);

    this.input.value = `${this.config.values[this.values.start]}, ${this.config.values[this.values.end]}`;

    return this.onChange();
  }

  _addEvents() {
    this.pointers.forEach((item) => {
      item.addEventListener("focus", this._focus.bind(this));
      item.addEventListener("blur", this._blur.bind(this));
      item.addEventListener("dragstart", this._dragstart.bind(this));
      item.addEventListener("mousedown", this._drag.bind(this));
      item.addEventListener("touchstart", this._touchstart.bind(this));
      item.addEventListener("touchmove", this._move.bind(this));
      item.addEventListener("touchcancel", this._touchend.bind(this));
      item.addEventListener("touchend", this._touchend.bind(this));
    });

    this.lane.addEventListener("mousedown", this._down.bind(this));
    this.connection.addEventListener("mousedown", this._down.bind(this));

    window.addEventListener("resize", this._resize.bind(this));

    return this._setValues();
  }

  _getActivePointer(evt) {
    const attr = evt.target.getAttribute("data-pointer");
    if(attr === "left") this.activePointer = this.leftPointer;
    if(attr === "right") this.activePointer = this.rightPointer;
  }

  _dragstart(evt) {
    evt.preventDefault();
  }

  _drag(evt) {
    if(this.config.disabled) return;
    this._getActivePointer(evt);

    this.shift = evt.clientX - this.activePointer.getBoundingClientRect().left;
    if(this.slider.classList.contains(this.cls.sliding)) this.slider.classList.remove(this.cls.sliding);

    createOnDocumentEvents(this.theDocumentEvents, "mousemove", this._move.bind(this));
    createOnDocumentEvents(this.theDocumentEvents, "mouseup", this._drop.bind(this));
  }

  _drop(evt) {
    evt.preventDefault();

    removeOnDocumentEvents(this.theDocumentEvents, "mousemove, mouseup");
  }

  _touchstart(evt) {
    if(this.config.disabled) return;

    this._getActivePointer(evt);
    this.shift = evt.touches[0].clientX - this.activePointer.getBoundingClientRect().left;
    if(this.slider.classList.contains(this.cls.sliding)) this.slider.classList.remove(this.cls.sliding);
  }

  _touchend(evt) {
    if(this.config.disabled) return;
    evt.preventDefault();
    this.activePointer = null;
  }

  _focus(evt) {
    if(this.config.disabled) return;
    this._getActivePointer(evt);

    createOnDocumentEvents(this.theDocumentEvents, "keydown", this._keydown.bind(this));
  }

  _blur() {
    if(this.config.disabled) return;
    this.activePointer = null;

    removeOnDocumentEvents(this.theDocumentEvents, "keydown");
  }

  _getPoint(evt, action) {
    if(!action) {
      throw new Error("No action defined...");
    }

    let point = null;
    const CX = evt.type === "touchmove" ? evt.touches[0].clientX : evt.clientX;
    const SP = this.activePointer === this.leftPointer ? this.values.start : this.values.end;
    this.keyStep = this.config.keyStep;

    switch (action) {
      case "move":
        point = (CX - this.sliderLeft) + (this.pointerWidth / 2 - this.shift);
        point = Math.round(point / this.piece);
        break;
      case "down":
        point = Math.round((CX - this.sliderLeft) / this.piece);
        break;
      case "right":
        point = Math.round(SP + this.keyStep);
        break;
      case "left":
        point = Math.round(SP - this.keyStep);
    }

    if(point <= 0) point = 0;
    if(point > this.config.values.length - 1) point = this.config.values.length - 1;

    return point;
  }

  _move(evt) {
    evt.preventDefault();

    if(!this.activePointer || this.config.disabled) {
      return false;
    }

    const point = this._getPoint(evt, "move");

    if(this.activePointer === this.leftPointer) this.values.start = point;
    if(this.activePointer === this.rightPointer) this.values.end = point;

    return this._setValues();
  }

  _keydown(evt) {
    if(this.config.disabled) return;
    let point = null;

    if(evt.key !== this.Arrow.right && evt.key !== this.Arrow.left) return;

    if(evt.key === this.Arrow.right) point = this._getPoint(evt, "right");
    if(evt.key === this.Arrow.left) point = this._getPoint(evt, "left");

    if(this.activePointer === this.leftPointer) this.values.start = point;
    if(this.activePointer === this.rightPointer) this.values.end = point;

    return this._setValues();
  }

  _down(evt) {
    if(this.config.disabled) return;
    evt.preventDefault();

    const getPoint = this._getPoint(evt, "down");

    if(!this.slider.classList.contains(this.cls.sliding)) this.slider.classList.add(this.cls.sliding);

    if(getPoint - this.values.start <= this.values.end - getPoint) {
      this.values.start = getPoint;
    } else {
      this.values.end = getPoint;
    }

    return this._setValues();
  }

  _resize() {
    this.sliderLeft = this.slider.getBoundingClientRect().left;
    this.sliderWidth = this.slider.clientWidth;

    if(this.slider.classList.contains(this.cls.sliding)) this.slider.classList.remove(this.cls.sliding);

    return this._setValues();
  }

  disable(boolean) {
    this.config.disabled = boolean;
    this.slider.classList[boolean ? "add" : "remove"](this.cls.disabled);
  }


  onChange() {
    if(typeof this.config.onChange !== "function") {
      return;
    }

    if(this.timer) clearTimeout(this.timer);

    this.timer = setTimeout(this.config.onChange(this.input.value));
  }

  getValue() {
    return this.input.value;
  }

  destroy() {
    this.input.style.display = this.inputDisplay;
    this.slider.remove();
  }
}
