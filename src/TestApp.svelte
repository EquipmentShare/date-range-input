<script>
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

	{#each displayMonths as displayMonthNumber}
		<div class="verticalspaceplz">
			<Month
				year={2020}
				month={displayMonthNumber}
			>
			</Month>
		</div>
	{/each}
</div>
