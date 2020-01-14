<svelte:options tag="test-app"></svelte:options>

<script>
	import DateRangeInput from './DateRangeInput.svelte'
	import Month from "./Month.svelte"
	let startDate = '2019-12-17'
	let endDate = '2020-01-07'

	const displayMonths = new Array(12).fill(null).map((_, i) => i + 1)
</script>

<style>
	.page {
		padding: 16px;
	}
	.verticalspaceplz {
		padding: 16px 0;
	}
</style>

<div class="page">
	<h1>Day Tripper</h1>

	<DateRangeInput
		start={ { year: 2020, month: 1, day: 10 } }
		end={ { year: 2020, month: 3, day: 20 } }
	>
	</DateRangeInput>

	<hr>

	{#each displayMonths as displayMonthNumber}
		<div class="verticalspaceplz">
			<Month
				primary={ { year: 2020, month: displayMonthNumber, day: 15 } }
				secondary={ { year: 2020, month: displayMonthNumber, day: 5 } }
			>
			</Month>
		</div>
	{/each}
</div>
