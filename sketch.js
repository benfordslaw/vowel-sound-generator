// Modified from Golan Levin's Tidy Vowel Trapezoid Using Formants in Tone.js
// https://editor.p5js.org/golan/sketches/El9vQ13I1

// RiTa vowel phonemes from https://rednoise.org/rita/reference/PhonemeTags.php
var ritaVowels = [
  "aa",
  "ae",
  "ah",
  "ao",
  "aw",
  "ay",
  "eh",
  "er",
  "ey",
  "ih",
  "iy",
  "ow",
  "oy",
  "uh",
  "uw",
  "spc"
];

var isPlaying = false;

var vowelLengthSlider,
  natSlider,
  pitchSlider,
  pitchVariabilitySlider,
  textInput;
var vowelLengthVariability = 100;
var vowelLength = 400; // in milliseconds
var pitch = 300;
var pitchVariability = 20;
var currentVowelIndex = 0;
var lastNoteTime = 0;
var vowelPhonemes = [];

var vowels = [];

var osc, noi, vol;
var filtf1, filtf2, filtf3;

function setup() {
  // Values from https://soundbridge.io/formants-vowel-sounds/
  vowels.push(new Vowel(570, 840, 2410, "ow"));
  vowels.push(new Vowel(300, 870, 2240, "oo"));
  vowels.push(new Vowel(440, 1020, 2240, "u"));
  vowels.push(new Vowel(730, 1090, 2440, "a"));
  vowels.push(new Vowel(520, 1190, 2390, "uh"));
  vowels.push(new Vowel(490, 1350, 1690, "er"));
  vowels.push(new Vowel(660, 1720, 2410, "ae"));
  vowels.push(new Vowel(530, 1840, 2480, "e"));
  vowels.push(new Vowel(390, 1990, 2550, "i"));
  vowels.push(new Vowel(270, 2290, 3010, "iy"));

  vol = new Tone.Volume(0).toDestination();

  filtf1 = new Tone.Filter(490, "bandpass").connect(vol);
  filtf1.Q.value = 5.0;

  filtf2 = new Tone.Filter(1420, "bandpass").connect(vol);
  filtf2.Q.value = 13.0;

  filtf3 = new Tone.Filter(2380, "bandpass").connect(vol);
  filtf3.Q.value = 14.0;

  //noise adds a little natural-ness
  noi = new Tone.Noise({
    type: "pink",
    volume: -16
  }).fan(filtf1, filtf2, filtf3);

  osc = new Tone.Oscillator({
    type: "sawtooth",
    frequency: random(280, 320),
    volume: -8
  }).fan(filtf1, filtf2, filtf3);

  var htmlTitle = createElement(
    "h2",
    "Synthesize Vowel Sounds from Words Using Formants"
  );
  htmlTitle.position(20, 50);

  textInput = createInput().size(300);
  textInput.position(20, 125);

  var listenButton = createButton("Play");
  listenButton.position(textInput.x + textInput.width + 10, textInput.y);
  listenButton.mousePressed(getVowels);

  var lengthSliderText = createElement(
    "p",
    "Length of Each Vowel Sound"
  ).position(20, 175);
  vowelLengthSlider = createSlider(10, 1000, 500);
  vowelLengthSlider.position(20, 210);
  vowelLengthSlider.style("width", "300px");

  var natSliderText = createElement(
    "p",
    "Variability in Vowel Length"
  ).position(20, 225);
  natSlider = createSlider(0, 100, 50);
  natSlider.position(20, 260);
  natSlider.style("width", "300px");

  var pitchSliderText = createElement("p", "Vowel Pitch").position(20, 275);
  pitchSlider = createSlider(0, 1000, 500);
  pitchSlider.position(20, 310);
  pitchSlider.style("width", "300px");

  var pitchVarSliderText = createElement(
    "p",
    "Vowel Pitch Variability"
  ).position(20, 325);
  pitchVariabilitySlider = createSlider(0, 200, 20);
  pitchVariabilitySlider.position(20, 360);
  pitchVariabilitySlider.style("width", "300px");
}

//only runs once to initialize some things based on the input text
function getVowels() {
  //RiTa.getPhonemes ignores spaces, so here each space is converted into '-spc-', which will be split
  //into its own element in the array just like any other vowel
  var inputPhonemes = split(
    RiTa.getPhonemes(textInput.value()).replaceAll(" ", "-spc-"),
    "-"
  );
  currentVowelIndex = 0;
  vowelPhonemes = [];

  //add only the vowels by comparing each phoneme to a list of vowel sounds used in RiTa
  for (var i = 0; i < inputPhonemes.length; i++) {
    if (ritaVowels.includes(inputPhonemes[i])) {
      vowelPhonemes.push(inputPhonemes[i]);
    }
  }

  //start the sequence of playing vowels (continued in draw())
  playVowel(vowelPhonemes[currentVowelIndex]);

  isPlaying = true;
}

function mousePressed() {
  if (isPlaying) {
    osc.start();
    noi.start();
  }
}

function touchStarted() {
  if (isPlaying) {
    osc.start();
    noi.start();
  }
}

//called at every new vowel
function playVowel(currentVowel) {
  var startTime = millis();

  //convert RiTa phonemes into the phonemes we can work with
  //not the most precise conversion at the moment
  currentVowel = currentVowel
    .replaceAll("aa", "a")
    .replaceAll("ah", "uh")
    .replaceAll("ao", "a+ow")
    .replaceAll("aw", "ow+oo")
    .replaceAll("ay", "a+iy")
    .replaceAll("eh", "e")
    .replaceAll("ey", "ae")
    .replaceAll("ih", "i")
    .replaceAll("oy", "ow+iy")
    .replaceAll("uh", "u")
    .replaceAll("uw", "oo");

  var diphthong = split(currentVowel, "+");
  var diphVowelLength = vowelLength / diphthong.length;

  if (diphthong.length == 1) {
    for (var i = 0; i < vowels.length; i++) {
      //each phoneme will correspond to an element in the vowel array, find the correspondence by comparing names
      if (diphthong[0] == vowels[i].name) {
        var currentVowelObj = vowels[i];

        //random base pitch
        osc.frequency.rampTo(
          pitch + random(-pitchVariability, pitchVariability),
          0.1
        );

        filtf1.frequency.rampTo(currentVowelObj.f1, 0.1);
        filtf2.frequency.rampTo(currentVowelObj.f2, 0.1);
        filtf3.frequency.rampTo(currentVowelObj.f3, 0.1);
      }
    }
  } else {
    for (var i = 0; i < vowels.length; i++) {
      //each phoneme will correspond to an element in the vowel array, find the correspondence by comparing names
      if (diphthong[0] == vowels[i].name) {
        var currentVowelObj = vowels[i];

        //random base pitch
        osc.frequency.rampTo(
          pitch + random(-pitchVariability, pitchVariability),
          0.1
        );

        filtf1.frequency.value = currentVowelObj.f1;
        filtf2.frequency.value = currentVowelObj.f2;
        filtf3.frequency.value = currentVowelObj.f3;
      }
    }
    for (var i = 0; i < vowels.length; i++) {
      //each phoneme will correspond to an element in the vowel array, find the correspondence by comparing names
      if (diphthong[1] == vowels[i].name) {
        var nextVowelObj = vowels[i];

        filtf1.frequency.rampTo(nextVowelObj.f1, vowelLength / 1000);
        filtf2.frequency.rampTo(nextVowelObj.f2, vowelLength / 1000);
        filtf3.frequency.rampTo(nextVowelObj.f3, vowelLength / 1000);
      }
    }
  }

  //introduce a little variability/humanness into the vowel length
  lastNoteTime =
    millis() + random(-vowelLengthVariability, vowelLengthVariability);
}

function draw() {
  //draw() is the only function called frequently enough to update the slider
  vowelLength = vowelLengthSlider.value();
  vowelLengthVariability = (vowelLength * natSlider.value()) / 200;

  pitch = pitchSlider.value();
  pitchVariability = pitchVariabilitySlider.value();

  if (isPlaying && millis() - lastNoteTime > vowelLength) {
    currentVowelIndex++;
    if (currentVowelIndex >= vowelPhonemes.length) {
      //stops everything until new input text
      osc.stop();
      noi.stop();
      isPlaying = false;
    } else if (vowelPhonemes[currentVowelIndex] == "spc") {
      //mutes everything if the current "vowel" is a space
      vol.mute = true;
      //makes spaces a lot shorter than the vowel sounds themselves
      lastNoteTime =
        millis() -
        random(vowelLengthVariability, (4 * vowelLengthVariability) / 5);
    } else {
      //unmute after spaces
      if (vol.mute) {
        vol.mute = false;
      }
      playVowel(vowelPhonemes[currentVowelIndex]);
    }
  }
}

class Vowel {
  constructor(f1, f2, f3, name) {
    this.f1 = f1;
    this.f2 = f2;
    this.f3 = f3;
    this.name = name;
  }
}

//leave this stuff here and don't worry about it. It's just here to make this code editor recognize p5 functions
/* global alpha, blue, brightness, CENTER, color, green, hue, lerpColor, lightness, red, saturation, p5.Color, Setting, background, clear, colorMode, fill, noFill, noStroke, stroke, erase, noErase, arc, ellipse, circle, line, point, quad, rect, square, triangle, ellipseMode, noSmooth, rectMode, smooth, strokeCap, strokeJoin, strokeWeight, bezier, bezierDetail, bezierPoint, bezierTangent, curve, curveDetail, curveTightness, curvePoint, curveTangent, beginContour, beginShape, bezierVertex, curveVertex, endContour, endShape, quadraticVertex, vertex, plane, box, sphere, cylinder, cone, ellipsoid, torus, loadModel, model, HALF_PI, PI, QUARTER_PI, TAU, TWO_PI, DEGREES, RADIANS, print, frameCount, deltaTime, focused, cursor, frameRate, noCursor, displayWidth, displayHeight, windowWidth, windowHeight, windowResized, width, height, fullscreen, pixelDensity, displayDensity, getURL, getURLPath, getURLParams, preload, setup, draw, remove, disableFriendlyErrors, noLoop, loop, isLooping, push, pop, redraw, p5, DOM, p5.Element, select, selectAll, removeElements, changed, input, createDiv, createP, createSpan, createImg, createA, createSlider, createButton, createCheckbox, createSelect, createRadio, createColorPicker, createInput, createFileInput, createVideo, createAudio, createCapture, createElement, p5.MediaElement, p5.File, p5.Graphics, createCanvas, resizeCanvas, noCanvas, createGraphics, blendMode, drawingContext, setAttributes, console, applyMatrix, resetMatrix, rotate, rotateX, rotateY, rotateZ, scale, shearX, shearY, translate, LocalStorage, storeItem, getItem, clearStorage, removeItem, createStringDict, createNumberDict, p5.TypedDict, p5.NumberDict, append, arrayCopy, concat, reverse, shorten, shuffle, sort, splice, subset, float, int, str, boolean, byte, char, unchar, hex, unhex, join, match, matchAll, nf, nfc, nfp, nfs, split, splitTokens, trim, deviceOrientation, accelerationX, accelerationY, accelerationZ, pAccelerationX, pAccelerationY, pAccelerationZ, rotationX, rotationY, rotationZ, pRotationX, pRotationY, pRotationZ, turnAxis, setMoveThreshold, setShakeThreshold, deviceMoved, deviceTurned, deviceShaken, Keyboard, keyIsPressed, key, keyCode, keyPressed, keyReleased, keyTyped, keyIsDown, Mouse, movedX, movedY, mouseX, mouseY, pmouseX, pmouseY, winMouseX, winMouseY, pwinMouseX, pwinMouseY, mouseButton, mouseIsPressed, mouseMoved, mouseDragged, mousePressed, mouseReleased, mouseClicked, doubleClicked, mouseWheel, requestPointerLock, exitPointerLock, touches, touchStarted, touchMoved, touchEnded, createImage, saveCanvas, saveFrames, p5.Image, loadImage, image, tint, noTint, imageMode, Pixels, pixels, blend, copy, filter, get, loadPixels, set, updatePixels, IO, loadJSON, loadStrings, loadTable, loadXML, loadBytes, httpGet, httpPost, httpDo, p5.XML, createWriter, p5.PrintWriter, save, saveJSON, saveStrings, saveTable, Table, p5.Table, p5.TableRow, day, hour, minute, millis, month, second, year, Math, abs, ceil, constrain, dist, exp, floor, lerp, log, mag, map, max, min, norm, pow, round, sq, sqrt, fract, Vector, createVector, p5.Vector, noise, noiseDetail, noiseSeed, randomSeed, random, randomGaussian, Trigonometry, acos, asin, atan, atan2, cos, sin, tan, degrees, radians, angleMode, textAlign, textLeading, textSize, textStyle, textWidth, textAscent, textDescent, loadFont, text, textFont, p5.Font, orbitControl, debugMode, noDebugMode, ambientLight, specularColor, directionalLight, pointLight, lights, lightFalloff, spotLight, noLights, Material, loadShader, createShader, shader, resetShader, normalMaterial, texture, textureMode, textureWrap, ambientMaterial, emissiveMaterial, specularMaterial, shininess, p5.Geometry, p5.Shader, camera, perspective, ortho, frustum, createCamera, p5.Camera, setCamera*/
/* global RiTa, Tone */
