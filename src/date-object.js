export const datesMatch = (a, b) => a.year === b.year
	&& a.month === b.month
	&& a.day === b.day

export const dateGt = (a, b) => {
	if (a.year === b.year && a.month === b.month) {
		return a.day > b.day
	} else if (a.year === b.year) {
		return a.month > b.month
	} else {
		return a.year > b.year
	}
}

export const dateLt = (a, b) => {
	return !dateGt(a, b) && !datesMatch(a, b)
}

export const dateLte = (a, b) => !dateGt(a, b)

export const dateGte = (a, b) => dateGt(a, b) || datesMatch(a, b)
