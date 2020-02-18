<svelte:options tag="test-app"></svelte:options>

<script>
	import DateRangeInput from './DateRangeInput.svelte'

	const pad2 = number => number.toString().padStart(2, '0')
	const toIsoDate = date => `${date.year}-${pad2(date.month)}-${pad2(date.day)}`

	let changes = []

	let start = { year: 2020, month: 1, day: 10 }
	let end = { year: 2020, month: 1, day: 20 }

	let visibleStartMonth = { year: 2020, month: 1 }
	let visibleEndMonth = { year: 2020, month: 2 }

	const changeDate = () => {
		visibleStartMonth = start = { year: 2019, month: 1, day: 10 }
		visibleEndMonth = end = { year: 2019, month: 2, day: 20 }
	}
</script>

<style>
	.page {
		padding: 16px;
	}
</style>

<div class="page">
	<button on:click={changeDate}>Manually control the date from the outside</button>
	<DateRangeInput
		bind:start
		bind:end
		{visibleStartMonth}
		{visibleEndMonth}
		on:change={ ({ detail: range }) => changes = [...changes, range] }
	>
	</DateRangeInput>
	<hr>
	<label>
		Changes
		<ol>
			{#each changes as change}
				<li>
					Changed to start: {toIsoDate(change.start)}, end: {toIsoDate(change.end)}
				</li>
			{/each}
		</ol>
	</label>
</div>
