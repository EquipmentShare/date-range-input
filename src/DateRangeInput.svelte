<script>
	import Month from './Month.svelte'

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

	let mouseOverDate = null

	let startMouseDown = null
	let endMouseDown = null
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
		bind:primary={start}
		secondary={endMouseDown || end}
		bind:mouseDownDate={startMouseDown}
		bind:mouseOverDate
	></Month>
	<span class="hspace"></span>
	<Month
		bind:primary={end}
		secondary={startMouseDown || start}
		bind:mouseDownDate={endMouseDown}
		bind:mouseOverDate
	></Month>
</div>

<!--
	pass in "start" and "end" dates instead of primary and secondary
	months switch to emitting clicks/date changes, and exposing mouse/touch interaction state
	months allow binding a visible year+month

	DateRangeInput becomes responsible for assigning behavior on clicks/date changes





	-----------------------------------
	months need to be able to represent a range all by themselves.

	months need to know
		- whether the start or the end of the range should be colored with the primary color
		- whether the start or the end of the range should be changed on single-click
		- whether the start or the end of the range should be used to pick the initial display month
	a month registers a "change" on mouseup

	on mousedown:
		- UI needs to reflect the clicked date as a selected/secondary day
		- if the mouse is over the clicked date, show the range the original "other" date
		- if the mouse is over a different date, show the range towards that date

	when a month registers a change, the range picker needs to validate the other side of the range
-->
