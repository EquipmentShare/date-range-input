const anArbitrarySundayEarlyInTheMonth = new Date(2020, 0, 5)
const dayNumbers = [ 0, 1, 2, 3, 4, 5, 6 ]

let daysOfWeek = null

export default () => {
	if (!daysOfWeek) {
		const formatter = new Intl.DateTimeFormat(undefined, {
			weekday: `short`,
		})

		daysOfWeek = dayNumbers.map(dayNumber => {
			const date = new Date(anArbitrarySundayEarlyInTheMonth)
			date.setDate(date.getDate() + dayNumber)
			return formatter.format(date)
		})
	}

	return daysOfWeek
}
