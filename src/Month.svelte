<svelte:options tag="date-range-input-month"></svelte:options>

<script>
	import getMonthName from './get-month-name.js'
	import getDaysOfTheWeek from './get-days-of-the-week.js'
	import getMonthDaysArrays from './get-month-days-arrays.js'
	import { datesMatch, dateGte, dateLte, dateGt, dateLt } from './date-object.js'
	import mouseEventShouldBeReactedTo from 'click-should-be-intercepted-for-navigation'

	import { createEventDispatcher } from 'svelte'
	const dispatchEvent = createEventDispatcher()

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

	export let visibleMonth = {
		year: 2020,
		month: 1
	}

	$: visibleWeeks = getMonthDaysArrays(visibleMonth.year, visibleMonth.month).map(
		weeks => weeks.map(
			dayNumber => dayNumber ? dayAsVisibleDate(dayNumber) : null
		)
	)

	$: dateIsVisiblySelected = (date) => {
		return datesMatch(date, start)
			|| datesMatch(date, end)
	}
	const daysOfTheWeek = getDaysOfTheWeek()

	const switchMonth = (increment) => {
		let year = visibleMonth.year
		let month = visibleMonth.month + increment

		if (month < 1) {
			month += 12
			year -= 1
		} else if (month > 12) {
			month -= 12
			year += 1
		}

		visibleMonth = {
			year,
			month,
		}
	}

	const dayAsVisibleDate = day => ({
		year: visibleMonth.year,
		month: visibleMonth.month,
		day,
	})

	const ifMouseEventShouldBeReactedTo = thenDo => event => {
		if (mouseEventShouldBeReactedTo(event)) {
			thenDo(event)
		}
	}

</script>

<div class="container full-width">
	<div class="full-width month-row">
		<span>
			{getMonthName(visibleMonth.month)} {visibleMonth.year}
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
								on:click={ifMouseEventShouldBeReactedTo(
									() => dispatchEvent('daySelected', visibleDate)
								)}
								on:mouseover={ifMouseEventShouldBeReactedTo(
									() => dispatchEvent('mouseoverDate', visibleDate)
								)}
								on:mousedown={ifMouseEventShouldBeReactedTo(
									() => dispatchEvent('mousedownDate', visibleDate)
								)}
								on:mouseup={() => dispatchEvent('mouseupDate', visibleDate)}
							>
								<span
									class="day-color make-the-background-square-on-safari"
									data-range-left={dateLte(visibleDate, end) && dateGt(visibleDate, start)}
									data-range-right={dateGte(visibleDate, start) && dateLt(visibleDate, end)}
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

	button:focus {
		box-shadow: 0 0 0 calc(var(--size-base) / 8 ) var(--color-theme-gray-lightest);
		outline: none;
	}
	button::-moz-focus-inner {
		border: 0;
	}

	.day-color {
		width: 100%;
		height: calc(var(--day-width) * .85);
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

	.make-the-background-square-on-safari {
		position: relative;
	}
</style>
