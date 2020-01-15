<svelte:window on:mouseup={onMouseup}></svelte:window>

<script>
	import Month from './Month.svelte'
	import { datesMatch, dateLte } from './date-object.js'

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

	let startMouseDown = null
	let endMouseDown = null

	let mouseoverDate = null

	let visibleStartMonth = {
		year: start.year,
		month: start.month,
	}

	let visibleEndMonth = {
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

	const onMouseup = () => {
		startMouseDown = null
		endMouseDown = null
	}

	const onMouseoverDate = ({ detail: date }) => {
		if (startMouseDown || endMouseDown) {
			mouseoverDate = date
		}
	}

	const onMouseupDate = () => {
		if (startMouseDown || endMouseDown) {
			start = displayRange.start
			end = displayRange.end
		}
	}
</script>

<style>
	@import "./css/reset.css";

	.container {
		display: flex;
	}

	.hspace {
		width: 16px;
	}
</style>

<div class="container">
	<Month
		start={displayRange.start}
		end={displayRange.end}

		on:mousedownDate={({ detail: date }) => mouseoverDate = startMouseDown = date}
		on:mouseoverDate={onMouseoverDate}
		on:mouseupDate={onMouseupDate}
		on:daySelected={({ detail: date }) => {
			onMouseup()
			start = date
		}}

		bind:visibleMonth={visibleStartMonth}
	></Month>
	<span class="hspace"></span>
	<Month
		start={displayRange.start}
		end={displayRange.end}

		on:mousedownDate={({ detail: date }) => mouseoverDate = endMouseDown = date}
		on:mouseoverDate={onMouseoverDate}
		on:mouseupDate={onMouseupDate}
		on:daySelected={({ detail: date }) => {
			onMouseup()
			end = date
		}}

		bind:visibleMonth={visibleEndMonth}
	></Month>
</div>
