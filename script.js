//=====//
// BOX //
//=====//
const Box = struct ({
	position: [0, 0],
	dimensions: [10, 10],
	
	left: 0,
	right: 10,
	top: 0,
	bottom: 10,

	highlighted: false,
	needsDraw: true,
})

const makeBox = (options = {}) => {
	const box = Box(options)
	updateBoxSides(box)
	return box
}

const drawBox = (context, box) => {
	if (!box.needsDraw) return
	box.needsDraw = false
	const {position, dimensions} = box
	const [x, y] = position
	const [width, height] = dimensions
	context.strokeStyle = box.highlighted? Colour.Blue : Colour.White
	context.strokeRect(x, y, width, height)
}

const updateBoxSides = (box) => {
	const {position, dimensions} = box
	const sides = getSides(position, dimensions)
	const {left, right, top, bottom} = sides
	box.left = left
	box.right = right
	box.top = top
	box.bottom = bottom
}

const isBoxInSelection = (box, selectionStart, selectionEnd) => {
	const {left, right, top, bottom} = box
	const [sx, sy] = selectionStart
	const [ex, ey] = selectionEnd

	const [ox, x] = sx < ex? [sx, ex] : [ex, sx]
	const [oy, y] = sy < ey? [sy, ey] : [ey, sy]

	if (right < ox) return false
	if (left > x) return false
	if (top < oy) return false
	if (bottom > y) return false

	return true

}

//=======//
// SIDES //
//=======//
// [left, right, top, bottom]
const getSides = (position, dimensions) => {

	const [x, y] = position
	const [width, height] = dimensions

	const left = x
	const right = x + width
	const top = y
	const bottom = y + height

	const sides = {left, right, top, bottom}
	return sides

}

//=======//
// WORLD //
//=======//
const boxes = []
const registerBox = (box) => {
	boxes.push(box)
}

const BOX_SPAWN_COUNT = 200_000
const spawnBoxes = () => {
	for (let i = 0; i < BOX_SPAWN_COUNT; i++) {
		const x = Random.Uint32 % innerWidth
		const y = Random.Uint32 % innerHeight
		const position = [x, y]
		const dimensions = [10 + (Random.Uint8 % 20) - 10, 10 + (Random.Uint8 % 20) - 10]
		const box = makeBox({position, dimensions})
		registerBox(box)
	}
}

//=======//
// SETUP //
//=======//
const stage = Stage.start()
spawnBoxes()

//======//
// TICK //
//======//
let currentBoxIndex = 0
stage.update = (context) => {
	context.lineWidth = 2

	
	for (let i = 0; i < 20_000; i++) {
		const box = boxes[currentBoxIndex]
		drawBox(context, box)
		currentBoxIndex++
		if (currentBoxIndex >= boxes.length) {
			currentBoxIndex = 0
		}
	}

}

stage.resize = () => {
	for (const box of boxes) {
		box.needsDraw = true	
	}
}

//======//
// HAND //
//======//
const hand = {
	isDown: false,
	selectionStartPosition: undefined,
	selectionEndPosition: undefined,
	selectionPreviousPosition: undefined,
	selectedBoxes: new Set(),
}

on.pointerdown(e => {
	hand.isDown = true
	hand.selectionStartPosition = [e.clientX, e.clientY]
	hand.selectedBoxes = new Set()
})

on.pointerup(e => {
	hand.isDown = false
})

on.pointermove(e => {
	if (!hand.isDown) return

	
	hand.selectionEndPosition = [e.clientX, e.clientY]
	if (hand.selectionPreviousPosition !== undefined) {
		const distance = getDistanceBetweenTwoVectors(hand.selectionPreviousPosition, hand.selectionEndPosition)
		hand.selectionPreviousPosition = hand.selectionEndPosition
		if (distance > 10) {
			hand.selectionIsOutOfDate = true
			return
		}
	}
	hand.selectionPreviousPosition = hand.selectionEndPosition

	for (const box of boxes) {
		if (isBoxInSelection(box, hand.selectionStartPosition, hand.selectionEndPosition)) {
			if (box.highlighted) continue
			box.highlighted = true
			box.needsDraw = true
			hand.selectedBoxes.add(box)
		} else {
			if (!box.highlighted) continue
			box.highlighted = false
			box.needsDraw = true
			hand.selectedBoxes.delete(box)
		}
	}
})

//========//
// VECTOR //
//========//
const getDisplacementBetweenTwoVectors = (a, b) => {
	const [ax, ay] = a
	const [bx, by] = b
	return [ax - bx, ay - by]
}

const getDistanceBetweenTwoVectors = (a, b) => {
	const displacement = getDisplacementBetweenTwoVectors(a, b)
	return Math.abs(Math.hypot(...displacement))
}