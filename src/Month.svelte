<svelte:options tag="x-month"></svelte:options>
<svelte:window on:mouseup={() => mouseDownDate = null}></svelte:window>

<script>
	import getMonthName from './get-month-name.js'
	import getDaysOfTheWeek from './get-days-of-the-week.js'
	import getMonthDaysArrays from './get-month-days-arrays.js'
	import { datesMatch, dateGte, dateLte, dateGt, dateLt } from './date-object.js'

	export let primary = {
		year: 2020,
		month: 1,
		day: 15
	}

	export let secondary = {
		year: 2020,
		month: 2,
		day: 15
	}

	$: visibleMonth = primary.month
	$: visibleYear = primary.year
	$: visibleWeeks = getMonthDaysArrays(visibleYear, visibleMonth).map(
		weeks => weeks.map(
			dayNumber => dayNumber ? dayAsVisibleDate(dayNumber) : null
		)
	)

	export let mouseDownDate = null
	export let mouseOverDate = null

	$: console.log('secondary', secondary)

	$: visiblePrimary = mouseDownDate || primary
	$: visibleSecondary = (mouseDownDate && mouseOverDate && !datesMatch(mouseDownDate, mouseOverDate))
		? mouseOverDate
		: secondary

	$: visiblySelectedDates = dateLte(visiblePrimary, visibleSecondary)
		? { first: visiblePrimary, last: visibleSecondary }
		: { first: visibleSecondary, last: visiblePrimary }

	$: dateIsVisiblySelected = (date) => {
		return datesMatch(date, visiblySelectedDates.first)
			|| datesMatch(date, visiblySelectedDates.last)
	}
	const daysOfTheWeek = getDaysOfTheWeek()

	const switchMonth = (increment) => {
		visibleMonth += increment

		if (visibleMonth < 1) {
			visibleMonth += 12
			visibleYear -= 1
		} else if (visibleMonth > 12) {
			visibleMonth -= 12
			visibleYear += 1
		}
	}

	const dayAsVisibleDate = day => ({
		year: visibleYear,
		month: visibleMonth,
		day,
	})

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
		padding: 0;
		border: 0;
		background-color: transparent;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	button[data-selected=true] {
		background-color: var(--color-ui-primary);
		color: var(--color-theme-offwhite);
	}

	.day-color {
		width: 100%;
		height: 85%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	[data-range-right=true] {
		background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0) 50%, rgba(0,173,238,0.2) 50%, rgba(0,173,238,0.2) 100%);
	}
	[data-range-left=true] {
		background: linear-gradient(90deg, rgba(0,173,238,0.2) 0%, rgba(0,173,238,0.2) 50%, rgba(255,255,255,0) 50%, rgba(255,255,255,0) 100%);
	}
	[data-range-right=true][data-range-left=true] {
		background: rgba(0,173,238,0.2);
	}
</style>

<div class="container full-width">
	<div class="full-width month-row">
		<span>
			{getMonthName(visibleMonth)} {visibleYear}
		</span>
		<span style="display: flex;">
			<button type=button on:click={() => switchMonth(-1)}>
				❮
			</button>
			<button type=button on:click={() => switchMonth(1)}>
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
		{#each visibleWeeks as week}
			<div class="week">
				{#each week as visibleDate}
					{#if visibleDate === null}
						<span class=day>

						</span>
					{:else}
						<span
							class=day
						>
							<button
								type=button
								draggable=false
								data-selected={dateIsVisiblySelected(visibleDate)}
								on:click={() => primary = visibleDate}
								on:mousedown={() => mouseDownDate = visibleDate}
								on:mouseover={() => mouseOverDate = visibleDate}
							>
								<span
									class="day-color"
									data-range-left={dateLte(visibleDate, visiblySelectedDates.last) && dateGt(visibleDate, visiblySelectedDates.first)}
									data-range-right={dateGte(visibleDate, visiblySelectedDates.first) && dateLt(visibleDate, visiblySelectedDates.last)}
								>
									{visibleDate.day}
								</span>
							</button>
						</span>
					{/if}
				{/each}
			</div>
		{/each}
	</div>
</div>
