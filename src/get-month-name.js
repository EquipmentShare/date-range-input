let monthNames = null
const getMonthNames = () => {
	if (!monthNames) {
		const formatter = new Intl.DateTimeFormat(undefined, {
			month: `long`,
		})

		const zeroThroughEleven = new Array(12).fill(null).map((_, i) => i)

		monthNames = zeroThroughEleven.map(jsDateMonthNumber => formatter.format(new Date(2020, jsDateMonthNumber)))
	}

	return monthNames
}

export default monthNumber => {
	if (monthNumber < 1 || monthNumber > 12) {
		throw new Error(`getMonthName argument must be between 1 and 12 – you passed in ${monthNumber}`)
	}

	return getMonthNames()[monthNumber - 1]
}
