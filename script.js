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
	dragStartPosition: [0, 0],

	highlighted: false,
	needsDraw: true,
	needsUndraw: false,
	undrawPosition: [0, 0],
})

const makeBox = (options = {}) => {
	const box = Box(options)
	updateBoxSides(box)
	return box
}

const drawBox = (context, box) => {

	let drawCount = 0

	if (!box.needsDraw) return drawCount

	box.needsDraw = false
	const {position, dimensions} = box
	const [x, y] = position
	const [width, height] = dimensions
	context.strokeStyle = Colour.Black
	context.strokeRect(x, y, width, height)
	context.fillStyle = box.highlighted? Colour.Yellow : Colour.White
	context.fillRect(x, y, width, height)
	drawCount += 1
	return drawCount
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

	const [ox, dx] = sx < ex? [sx, ex] : [ex, sx]
	const [oy, dy] = sy < ey? [sy, ey] : [ey, sy]

	if (right < ox) return false
	if (left > dx) return false
	if (top < oy) return false
	if (bottom > dy) return false

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
		const dimensions = [5 + (Random.Uint8 % 10) - 5, 5 + (Random.Uint8 % 10) - 5]
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

	let drawCount = 0
	for (let i = 0; i < boxes.length; i++) {
		if (drawCount > 1_000) break
		const box = boxes[currentBoxIndex]
		drawCount += drawBox(context, box)
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
	dragStartPosition: undefined,
	dragOffsetPosition: undefined,
	selectionStartPosition: undefined,
	selectionEndPosition: undefined,
	selectionPreviousPosition: undefined,
	selectedBoxes: new Set(),
}

on.pointerdown(e => {
	hand.isDown = true
	const position = [e.clientX, e.clientY]
	if (isPositionInSelection(position, hand.selectionStartPosition, hand.selectionEndPosition)) {
		hand.dragStartPosition = position
		hand.dragOffsetPosition = getDisplacementBetweenVectors(hand.selectionStartPosition, position)
		hand.isDragging = true
	} else {
		hand.selectionStartPosition = position
		hand.selectedBoxes = new Set()
	}
})

on.pointerup(e => {

	const position = [e.clientX, e.clientY]
	if (hand.isDragging) {
		for (const box of hand.selectedBoxes.values()) {
			box.dragStartPosition = box.position
		}
		hand.isDragging = false
	}

	hand.isDown = false
})

on.pointermove(e => {
	if (!hand.isDown) return

	const position = [e.clientX, e.clientY]

	if (hand.isDragging) {
		
		const selectionDimensions = getDisplacementBetweenVectors(hand.selectionEndPosition, hand.selectionStartPosition)
		const newSelectionStartPosition = getAddedVectors(position, hand.dragOffsetPosition)
		const newSelectionEndPosition = getAddedVectors(newSelectionStartPosition, selectionDimensions)

		const displacement = getDisplacementBetweenVectors(position, hand.dragStartPosition)

		for (const box of boxes) {
			if (hand.selectedBoxes.has(box)) {
				box.position = getAddedVectors(box.dragStartPosition, displacement)
				updateBoxSides(box)
				box.needsDraw = true
			} else if (isBoxInSelection(box, hand.selectionStartPosition, hand.selectionEndPosition)) {
				box.needsDraw = true
			} /*else if (isBoxInSelection(box, newSelectionStartPosition, newSelectionEndPosition)) {
				box.needsDraw = true
			}*/
		}

		
		stage.context.fillStyle = Colour.Black
		stage.context.fillRect(hand.selectionStartPosition[0], hand.selectionStartPosition[1], selectionDimensions[0], selectionDimensions[1])
		//stage.context.fillRect(newSelectionStartPosition[0], newSelectionStartPosition[1], selectionDimensions[0], selectionDimensions[1])
		
		hand.selectionStartPosition = newSelectionStartPosition
		hand.selectionEndPosition = newSelectionEndPosition
		
		return
	}

	hand.selectionEndPosition = position
	if (hand.selectionPreviousPosition !== undefined) {
		const distance = getDistanceBetweenVectors(hand.selectionPreviousPosition, hand.selectionEndPosition)
		hand.selectionPreviousPosition = hand.selectionEndPosition
		if (distance > 10) {
			// TODO: delay selection over a couple of frames
			//hand.selectionIsOutOfDate = true
			//return
		}
	}
	hand.selectionPreviousPosition = hand.selectionEndPosition

	for (const box of boxes) {
		if (isBoxInSelection(box, hand.selectionStartPosition, hand.selectionEndPosition)) {
			if (box.highlighted) continue
			box.highlighted = true
			box.needsDraw = true
			box.dragStartPosition = box.position
			hand.selectedBoxes.add(box)
		} else {
			if (!box.highlighted) continue
			box.highlighted = false
			box.needsDraw = true
			hand.selectedBoxes.delete(box)
		}
	}
})

const isPositionInSelection = (position, startPosition, endPosition) => {
	if (startPosition === undefined) return false
	if (endPosition === undefined) return false

	const [sx, sy] = startPosition
	const [ex, ey] = endPosition

	const [ox, dx] = sx < ex? [sx, ex] : [ex, sx]
	const [oy, dy] = sy < ey? [sy, ey] : [ey, sy]

	const [x, y] = position

	if (x < ox) return false
	if (x > dx) return false
	if (y < oy) return false
	if (y > dy) return false

	return true
}

//========//
// VECTOR //
//========//
const getDisplacementBetweenVectors = (a, b) => {
	const [ax, ay] = a
	const [bx, by] = b
	return [ax - bx, ay - by]
}

const getDistanceBetweenVectors = (a, b) => {
	const displacement = getDisplacementBetweenVectors(a, b)
	return Math.abs(Math.hypot(...displacement))
}

const getAddedVectors = (a, b) => {
	const [ax, ay] = a
	const [bx, by] = b
	return [ax + bx, ay + by]
}