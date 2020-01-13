import zora from 'zora'
const { test } = zora

import getMonthDaysArrays, {getWeekArray} from './get-month-days-arrays.js'

test('getWeekArray', t => {
	t.deepEqual(getWeekArray(1, 20, 21), [null,20,21,null,null,null,null])
	t.deepEqual(getWeekArray(2, 3, 30), [null,null,3,4,5,6,7])
	t.deepEqual(getWeekArray(0,1,30), [1,2,3,4,5,6,7])
})

test('getMonthDaysArrays', t => {
	const expected = [
		[null,null,null,1,2,3,4],
		[5,6,7,8,9,10,11],
		[12,13,14,15,16,17,18],
		[19,20,21,22,23,24,25],
		[26,27,28,29,30,31,null]
	]

	t.deepEqual(getMonthDaysArrays(2020, 1), expected, 'January 2020')
})
