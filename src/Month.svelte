<script>
	import getMonthName from './get-month-name.js'
	import getDaysOfTheWeek from './get-days-of-the-week.js'
	import getMonthDaysArrays from './get-month-days-arrays.js'

	export let year = 2000
	export let month = 1

	$: weeks = getMonthDaysArrays(year, month)

	const daysOfTheWeek = getDaysOfTheWeek()

	const switchMonth = (increment) => {
		month += increment

		if (month < 1) {
			month += 12
			year -= 1
		} else if (month > 12) {
			month -= 12
			year += 1
		}
	}
</script>

<style>
	@import './css/tokens/size.css';
	@import './css/tokens/text.css';
	@import './css/tokens/color.css';
	@import './css/reset.css';

	.container {
		--day-width: calc(var(--size-base) * 1.75);
		--month-width: calc(var(--day-width) * 7);

		font-family: var(--text-font-family);
		color: var(--color-theme-charcoal);
		box-sizing: border-box;
		flex-direction: column;
	}

	.full-width {
		width: var(--month-width);
		display: flex;
	}

	.month-row {
		justify-content: space-between;
		align-items: center;
		padding-bottom: var(--size-quarter);
	}

	.weekday-names {
		font-size: var(--size-half);
		text-align: center;
		padding: var(--size-quarter) 0;
		color: var(--color-theme-default);
	}

	.weekday-name {
		flex-grow: 1;
	}

	.weeks {
		display: flex;
		flex-direction: column;
		align-items: stretch;
	}
	.week {
		display: flex;
		text-align: center;
		font-size: calc(var(--size-base) * .75);
	}
	.day {
		width: var(--day-width);
		height: var(--day-width);

		display: flex;
		justify-content: center;
		align-items: center;
	}

	button {
		width: var(--day-width);
		height: var(--day-width);
		border-radius: 50%;
		border: 0;
		background-color: transparent;
		cursor: pointer;
	}
</style>

<div class="container full-width">
	<div class="full-width month-row">
		<span>
			{getMonthName(month)}
		</span>
		<span>
			<button on:click={() => switchMonth(-1)}>
				❮
			</button>
			<button on:click={() => switchMonth(1)}>
				❯
			</button>
		</span>
	</div>
	<div class="full-width weekday-names">
		{#each daysOfTheWeek as dayOfTheWeek}
			<span class=weekday-name>
				{dayOfTheWeek}
			</span>
		{/each}
	</div>
	<div class="full-width weeks">
		{#each weeks as week}
			<div class="week">
				{#each week as day}
					{#if day === null}
						<span class=day>

						</span>
					{:else}
						<span class=day>
							{day}
						</span>
					{/if}
				{/each}
			</div>
		{/each}
	</div>
</div>
