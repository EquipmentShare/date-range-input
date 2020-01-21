<svelte:window on:mouseup={clearAnyMouseDown}></svelte:window>

<script>
	import Month from './Month.svelte'
	import { datesMatch, dateLt, dateLte, dateGt } from './date-object.js'
	import { createEventDispatcher } from "svelte"

	const dispatch = createEventDispatcher()

	export let start = {
		year: 2020,
		month: 1,
		day: 15
	}

	export let end = {
		year: 2020,
		month: 2,
		day: 15
	}

	$: dispatch('change', { start, end })

	let startMouseDown = null
	let endMouseDown = null

	let mouseoverDate = null

	export let visibleStartMonth = {
		year: start.year,
		month: start.month,
	}

	export let visibleEndMonth = {
		year: end.year,
		month: end.month,
	}

	const datesAsRange = (dateA, dateB) => {
		if (dateLte(dateA, dateB)) {
			return {
				start: dateA,
				end: dateB
			}
		} else {
			return {
				start: dateB,
				end: dateA
			}
		}
	}

	const getDisplayRange = ({
		start,
		end,
		startMouseDown,
		endMouseDown,
		mouseoverDate
	}) => {
		if (startMouseDown) {
			start = startMouseDown
			if (mouseoverDate && !datesMatch(mouseoverDate, start)) {
				end = mouseoverDate
			}
		} else if (endMouseDown) {
			end = endMouseDown
			if (mouseoverDate && !datesMatch(mouseoverDate, end)) {
				start = mouseoverDate
			}
		}

		return datesAsRange(start, end)
	}

	$: displayRange = getDisplayRange({ start, end, startMouseDown, endMouseDown, mouseoverDate })

	const clearAnyMouseDown = () => {
		startMouseDown = endMouseDown = null
	}

	const onMouseoverDate = ({ detail: date }) => {
		if (startMouseDown || endMouseDown) {
			mouseoverDate = date
		}
	}

	const onMouseupDate = ({ detail: date }) => {
		const mouseWasDown = startMouseDown || endMouseDown
		const wasAClickOnStart = startMouseDown && datesMatch(date, startMouseDown)
		const wasAClickOnEnd = endMouseDown && datesMatch(date, endMouseDown)

		if (mouseWasDown && !wasAClickOnStart && !wasAClickOnEnd) {
			start = displayRange.start
			end = displayRange.end
		}
	}

	const onStartDaySelected = ({ detail: date }) => {
		clearAnyMouseDown()
		if (dateGt(date, end)) {
			start = end
			end = date
		} else if (!datesMatch(date, start)) {
			start = date
		}
	}

	const onEndDaySelected = ({ detail: date }) => {
		clearAnyMouseDown()
		if (dateLt(date, start)) {
			end = start
			start = date
		} else if (!datesMatch(date, end)) {
			end = date
		}
	}
</script>

<div class="container">
	<Month
		start={displayRange.start}
		end={displayRange.end}

		on:mousedownDate={({ detail: date }) => mouseoverDate = startMouseDown = date}
		on:mouseoverDate={onMouseoverDate}
		on:mouseupDate={onMouseupDate}
		on:daySelected={onStartDaySelected}

		bind:visibleMonth={visibleStartMonth}
	></Month>
	<span class="hspace"></span>
	<Month
		start={displayRange.start}
		end={displayRange.end}

		on:mousedownDate={({ detail: date }) => mouseoverDate = endMouseDown = date}
		on:mouseoverDate={onMouseoverDate}
		on:mouseupDate={onMouseupDate}
		on:daySelected={onEndDaySelected}

		bind:visibleMonth={visibleEndMonth}
	></Month>
</div>

<style>
	@import "./css/reset.css";
	@import "./css/tokens/size.css";

	.container {
		display: flex;
	}

	.hspace {
		width: var(--size-base);
	}
</style>
