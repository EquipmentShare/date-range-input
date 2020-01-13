import getDaysInMonth from './get-days-in-month.js'

export const getWeekArray = (startWeekday, firstDayNumber, lastDayNumber) => {
	const week = new Array(7).fill(null)

	const lastWeekday = Math.min(6, lastDayNumber - firstDayNumber + startWeekday)
	for (let i = startWeekday; i <= lastWeekday; ++i) {
		week[i] = firstDayNumber + i - startWeekday
	}
	return week
}

const gimmeWeeks = (startWeekday, startDayNumber, lastDayNumber) => {
	const weeks = [
		getWeekArray(startWeekday, startDayNumber, lastDayNumber)
	]

	let daysLeft = lastDayNumber - (7 - startWeekday)
	let nextStartDayNumber = startDayNumber + (7 - startWeekday)

	while (daysLeft > 0) {
		weeks.push(getWeekArray(0, nextStartDayNumber, lastDayNumber))
		daysLeft -= 7
		nextStartDayNumber += 7
	}

	return weeks
}

export default (year, month) => {
	const daysInMonth = getDaysInMonth(year, month)
	const weekdayOfFirstDayInMonth = new Date(year, month - 1).getDay()

	return gimmeWeeks(weekdayOfFirstDayInMonth, 1, daysInMonth)
}
