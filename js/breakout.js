/**
 * Copyright © 2016
 * @author Samuel Kaiser
 */

var canvas = document.getElementById("breakout")
var context = canvas.getContext("2d")

/** resize the canvas as the window size might have changed */
canvas.resize = function() {
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
}

var requestAnimationFrame = window.requestAnimationFrame
  || window.webkitRequestAnimationFrame
  || window.msRequestAnimationFrame
  || window.mozRequestAnimationFrame

var properties = {
  theme: "shades_red",
  grid: {
    size: { x: 20, y: 20 },
    layers: [
      { color: "red", speed_modifier: 2.0 },
      { color: "yellow", speed_modifier: 1.4 },
      { color: "orange", speed_modifier: 1.6 },
      { color: "green", speed_modifier: 1.2 }, 
      { color: "blue", speed_modifier: 1.1 },
      { color: "purple", speed_modifier: 1.0 }
    ]
  },
  lifes: 3,
  ball: {
    speed: 0.5, // parts of the screen width per second
    limit: 1    // limit of possible balls in the game at once
  },
  slider: {
    width: 0.15,
    height: 0.03,
    speed: 0.0125,
    pos: { x: 0.5, y: 0.9 },
    color: "#DDD"
  },
  text: {
    margin: 0.005,
    font: "Arial",
    size: 0.02
  }
}
properties.grid.boundaries = {
  x: { min: 0, add: properties.grid.size.x },
  y: { min: 2, add: properties.grid.layers.length-1 }
}

var layers,
    grid,
    balls,
	  slider,
	  time = { started: undefined, ended: undefined },
	  pause = {},
	  lifes,
    running,
    events = [],

    counter = 0,
    fps = 0

var init = function() {
  running = false
  reset()
}

var reset = function() {
  if(element = document.getElementById("congrats")) document.body.removeChild(element)
  layers = typeof themes != 'undefined' ? themes[properties.theme].layers : properties.grid.layers
  grid = new Grid(properties.grid.size.x, properties.grid.size.y, properties.grid.boundaries)
  balls = []
  slider = properties.slider
  pause = { paused: false, date: 0, time: 0, toggle: function(state) {
    if(!pause.paused) pause.date = Date.now()
      pause.paused = typeof state == 'undefined' ? state : !pause.paused
  }}
  lifes = properties.lifes
  grid.count()
}

var move = function() {
  if(slider.pos.x+slider.movement > 0 && slider.pos.x+slider.movement < 1)
    slider.pos.x+=slider.movement
}

var start = function() {
  if(lifes>0 && balls.length<properties.ball.limit) {
    var ball = new Ball()
    ball.movement.y = 1
    ball.movement.x = (Math.random()-0.5)*5
    ball.unit()
    ball.speed = properties.ball.speed
    balls.push(ball)
    if(!running) {
      time.started = Date.now()
    }
    running = true
  }
}

var end = function() {
  time.ended = Date.now()
  delete time.started
  running = false
  congrats(grid.number == 0)
}

/** triggers updating the game logic and redrawing the canvas */
var loop = function() {
  var now = Date.now()
  var delta = (now - then) / 1000 // delta in seconds
  handler()
  if(!pause.paused) {
    if(pause.date>0) {
      pause.time += Date.now() - pause.date
      pause.date = 0
    }
    update(delta)
  }
  redraw(delta)
  then = now
  counter++
  requestAnimationFrame(loop)
}

/** draws the game's current state to the canvas */
var redraw = function(delta) {
  canvas.resize()

  // drawing grid
  var pos = { x: 0, y: 0 }
  var border = -0.01
  var plus = { x: (canvas.width-border*canvas.width)/grid.size.x, y: (canvas.height-border*canvas.width)/grid.size.y }
  for (var x=0; x<grid.size.x; x++) {
    for (var y=0; y<grid.size.y; y++) {
      if(grid.array[x][y].content) {
        context.fillStyle = grid.array[x][y].content.color
        context.fillRect(grid.array[x][y].pos.x*canvas.width+border,
          grid.array[x][y].pos.y*canvas.height+border, plus.x-border, plus.y-border)
      }
      pos.y+=plus.y
    }
    pos.y = 0
    pos.x+=plus.x
  }

  // drawing slider
  context.fillStyle = slider.color
  context.fillRect(slider.pos.x*canvas.width - slider.width*canvas.width/2,
    slider.pos.y*canvas.height, slider.width*canvas.width, slider.height*canvas.height)

  // drawing ball
  for (var i=0; i<balls.length; i++) {
    context.fillStyle = balls[i].color
    context.moveTo(balls[i].pos.x, balls[i].pos.y)
    context.arc(balls[i].pos.x*canvas.width, balls[i].pos.y*canvas.height,
    balls[i].radius*(canvas.height+canvas.width)/2, 0, 2 * Math.PI, false)
    context.fill()
  }

  // drawing text
  context.fillStyle = "rgba(255, 255, 255, 1)"
  context.font = properties.text.size*canvas.height+"px "+properties.text.font
  var seconds = ((running ? (pause.paused ? pause.date : Date.now()) : time.ended)
                - time.started - pause.time) / 1000

  if(counter % 6 == 0 || !fps) fps = 1/delta

  var text = [
    "Lifes: "+lifes,
    "Bricks: "+grid.number,
    "Time: "+(seconds?seconds:0.00).toFixed(2)+"s",
    "FPS: "+fps.toFixed(2)
  ]
  context.fillText(text.join(", "), properties.text.margin*canvas.width, (1-properties.text.margin)*canvas.height)

  context.textAlign = "end"
  context.fillStyle = "rgba(255, 255, 255, 0.6)"
  context.font = properties.text.size*canvas.height/1.3+"px "+properties.text.font
  context.textBaseline = "top"
  context.fillText("Copyright \u00A9 2016 by Samuel Kaiser", (1-properties.text.margin)*canvas.width, (properties.text.margin)*canvas.height)
}

// updates the game
var update = function(delta) {
  move()
  if (lifes == 0 && running) end()
  else if (running && lifes>=0) {
    // updating balls
    for (var i=0; i<balls.length; i++) {
      var ball = balls[i]
      // walls
      if(ball.pos.x+ball.radius >= 1 || ball.pos.x-ball.radius < 0)
        ball.movement.x *= -1
      else if(ball.pos.y < 0)
        ball.movement.y *= -1
      else if(ball.pos.y >= 1) {
        balls.splice(i, 1)
        lifes--
      }
      else ball.update()
      if(ball) ball.move(delta)
    }
  } grid.update()
}

var handler = function() {
  var key = {
    handle: function(event) {
      if(event.type == "mousedown" || event.type == "touchdown") start()
      else switch(event.keyCode) {
        case 32: // space
          if(lifes>0) start()
          break
        case 37: // left
          slider.movement = event.type=="keydown" ? -properties.slider.speed : 0
          break
        case 39: // right
          slider.movement = event.type=="keydown" ? properties.slider.speed : 0
          break
        case 80: case 13: // p or enter
          if(event.type == "keydown") {
            pause.toggle()
          } break
      }
    },
    compatible: ['mousedown', 'touchdown', 'keydown', 'keyup']
  }
  var mouse = {
    handle: function(event) {
      var x = event.type=="mousemove" ? event.pageX : event.touches[0].pageX
      slider.pos.x = x/canvas.width
    },
    compatible: ['mousemove', 'touchmove']
  }
  events.forEach(function(event) {
      if(key.compatible.includes(event.type)) key.handle(event)
      if(mouse.compatible.includes(event.type)) mouse.handle(event)
  })
  events = []
}

function Grid() {
  this.array = []
  this.size = properties.grid.size
  this.boundaries = properties.grid.boundaries

  // initializes the grid
  for (var x = 0; x < this.size.x; x++) {
    this.array[x] = []
    for (var y = 0; y < this.size.y; y++) {
      this.array[x][y] = new Cell(
        { x: x/this.size.x, y: y/this.size.y }, // e.g. 1/20 for each grid cell (brick)
        (y>this.boundaries.y.min+this.boundaries.y.add || y<this.boundaries.y.min) ? null :
        new Brick("brick", layers[y-this.boundaries.y.min].color, layers[y-this.boundaries.y.min].speed_modifier)
      ) 
    }
  }

  /**
   * determinates the number of bricks in the grid
   * @param {Brick} brick if executed from a brick that will be deleted but still exists, overload that brick
   */
  this.count = function(brick) {
    var number = 0
    for(var x=0; x<this.array.length; x++) for(var y=0; y<this.array[x].length; y++)
      if(this.array[x][y].content) number++
    this.number = brick ? number-1 : number
    return number
  }

  /** initial number of bricks */
  this.initial = this.count()

  /** updates the bricks */
  this.update = function() {
    for (var x=0; x<this.array.length; x++) for (var y=0; y<this.array[x].length; y++) {
      if(this.array[x][y].content) {
        if(this.array[x][y].content.health == 0) delete this.array[x][y].content
      }
    }
  }
}

function Ball() {
  this.speed = 0,
  this.pos = {
    x: slider.pos.x,
    y: slider.pos.y-slider.height/2
  },
  this.movement = { x: 0, y: 0 },
  this.color = "#DDD",
  this.radius = 0.015,
  /** updates the ball's positions */
  this.move = function(delta) {
    this.pos.x -= this.movement.x*this.speed*delta
    this.pos.y -= this.movement.y*this.speed*delta
  }
  this.invert = function() {
    this.movement.x *= -1
    this.movement.y *= -1
  }

  /** ensures that the vector's length is 1 */
  this.unit = function() {
    var value = Math.sqrt(this.movement.x*this.movement.x + this.movement.y*this.movement.y)
    this.movement.x /= value
    this.movement.y /= value
  }

  // TODO: Check all bricks / slider in the line between the current and previous position

  /** updates the ball's movement */
  this.update = function() {
    debugger
    var inverted = { x: false, y: false }
    this.coords = {
      x: Math.floor(grid.size.x*this.pos.x),
      y: Math.floor(grid.size.y*this.pos.y),
    }
    // checking for nearby wall
    var before_pos = { x: this.pos.x, y: this.pos.y }
    this.pos.y = (this.pos.y - this.radius < 0) ? (0 + this.radius) : this.pos.y
    this.pos.x = (this.pos.x + this.radius >= 1) ? (1 - this.radius) : ((this.pos.x - this.radius < 0) ? (0 + this.radius) : this.pos.x)

    if(before_pos.x != this.pos.x) {
      this.movement.x *= -1
      inverted.x = true
    }
    if(before_pos.y != this.pos.y) {
      this.movement.y *= -1
      inverted.y = true
    }

    // checking for nearby brick
    if(this.pos.y - this.radius >= 0 && this.pos.y + this.radius < 1 && (
       (cell = grid.array[this.coords.x][Math.floor((this.pos.y - this.radius) * grid.size.y)]) && cell.content ||
       (cell = grid.array[this.coords.x][Math.floor((this.pos.y + this.radius) * grid.size.y)]) && cell.content)) {
      cell.content.hurt()
      this.speed = properties.ball.speed * cell.content.speed_modifier
      if(!inverted.y) {
        this.movement.y *= -1
        inverted.y = true
      }
    } else
    if(this.pos.x - this.radius >= 0 && this.pos.x + this.radius < 1 && (
       (cell = grid.array[Math.floor((this.pos.x + this.radius) * grid.size.x)][this.coords.y]) && cell.content ||
       (cell = grid.array[Math.floor((this.pos.x - this.radius) * grid.size.x)][this.coords.y]) && cell.content)) {
      cell.content.hurt()
      this.speed = properties.ball.speed * cell.content.speed_modifier
      if(!inverted.x) {
        this.movement.x *= -1
        inverted.x = true
      }
    }
    // checking for nearby slider
    else if(this.pos.x < slider.pos.x+slider.width/2 &&
       this.pos.x > slider.pos.x-slider.width/2 &&
       this.pos.y < slider.pos.y+slider.height/2 &&
       this.pos.y > slider.pos.y-slider.height/2) {
      if(!inverted.y) {
        this.movement.y *= -1
        inverted.y = true
      }
      this.movement.x = (slider.pos.x - this.pos.x) * slider.width * 100
      this.pos.y-=0.01
      this.unit()
    }
  }
}

function Cell(pos, content) {
  this.pos = pos
  this.content = content
}

function Brick(type, color, speed_modifier, health) {
  this.type = type
  this.color = color
  this.speed_modifier = speed_modifier
  this.health = health ? health : 1
  this.hurt = function(power) {
    this.health -= power ? power : 1
    if(this.health <= 0) if(grid.count(this)<=1) end()
  }
}


var congrats = function(won) {
  var box = document.createElement("div")
  box.id = "congrats"
  console.log(box)

  var content = document.createElement("p")
  content.appendChild(document.createTextNode(won ?
    "Congrats! You shot "+grid.initial+" Bricks in "+(time.ended-time.started-pause.time).toFixed(2)+
    " seconds</b>! Do you want to play again?" : "Better luck next time. Try again?"))
  var button = document.createElement("button")
  button.setAttribute("onclick", "init()")
  button.innerHTML = "Play again"
  box.appendChild(content)
  box.appendChild(button)
  document.body.appendChild(box)

}

var then = Date.now()
var event = function(event) {
  keys.keydown[keyCode] = true
}

var names = {
  click: ['mousedown', 'mousemove',  'touchdown', 'touchmove'],
  key: ['keydown', 'keyup']
}
names.click.forEach(function(name) { canvas.addEventListener(name, function(event) { events.push(event) }) })
names.key.forEach(function(name) { addEventListener(name, function(event) { events.push(event) }) })

var hax = [
  function() {
    balls.forEach(function(ball) { ball.speed = 0 })
    properties.ball.speed = 0
  },
  function() {
    addEventListener('keydown', function(event) {
      var speed = 0.05
      if(event.keyCode==65) balls.forEach(function(ball) { ball.pos.x -= speed })
      else if(event.keyCode==68) balls.forEach(function(ball) { ball.pos.x += speed })
      else if(event.keyCode==87) balls.forEach(function(ball) { ball.pos.y -= speed })
      else if(event.keyCode==83) balls.forEach(function(ball) { ball.pos.y += speed })
    })
  }
]

init()
loop()
