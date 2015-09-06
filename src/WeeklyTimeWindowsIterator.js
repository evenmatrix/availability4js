"use strict"

import * as Status from "./Status.js"
import {Period} from "./Period.js"
import * as WeeklyTimeWindow from "./WeeklyTimeWindow.js"

export class WeeklyTimeWindowsIterator {
	constructor({weekly, cal}) {
		weekly = weekly || [] // List<WeeklyTimeWindow>
		cal = cal || null // Moment with tz
		
		this._cal = cal.clone() // "cal" is modified later, this allows the caller to reuse his version of it
		
		this._hasNext = true
		this._timeWindows = []
		this._isFirstAndLastSame = null
		
		if (weekly.length === 0) {
			this._timeWindows.push({
				minuteOfWeek : 0,
				durationMins : WeeklyTimeWindow.WEEK,
				status : Status.STATUS_AVAILABLE
			})
			this._isFirstAndLastSame = true
		} else {
			let minuteOfWeek = 0
			for (let i = 0, l = weekly.length; i < l; ++i) {
				let timeWindow = weekly[i]
				if (timeWindow.minuteOfWeek > minuteOfWeek) {
					this._timeWindows.push({
						minuteOfWeek : minuteOfWeek,
						durationMins : timeWindow.minuteOfWeek - minuteOfWeek,
						status : Status.STATUS_UNAVAILABLE
					})
				}
				this._timeWindows.push({
					minuteOfWeek : timeWindow.minuteOfWeek,
					durationMins : timeWindow.durationMins,
					status : Status.STATUS_AVAILABLE
				})
				minuteOfWeek = this._endMinuteOfWeek(timeWindow)
			}
			if (minuteOfWeek < WeeklyTimeWindow.WEEK) {
				this._timeWindows.push({
					minuteOfWeek : minuteOfWeek,
					durationMins : WeeklyTimeWindow.WEEK - minuteOfWeek,
					status : Status.STATUS_UNAVAILABLE
				})
			}
			
			let firstWindow = this._timeWindows[0]
			let lastWindow = this._timeWindows[this._timeWindows.length - 1]
			this._isFirstAndLastSame = (firstWindow.status === lastWindow.status)
		}
		
		this._isConstant = (this._timeWindows.length === 1)
	}
	
	/**
	 * @param timeWindow   WeeklyTimeWindow 
	 * @return Integer 
	 */
	_endMinuteOfWeek(timeWindow) {
		return timeWindow.minuteOfWeek + timeWindow.durationMins
	}
	
	/** @return Boolean */
	hasNext() {
		return this._hasNext
	}
	
	/** @return Status */
	next() {
		if (this._isConstant) {
			this._hasNext = false
			return {
				status: this._timeWindows[0].status,
				until : null
			}
		}
		
		let minuteOfWeek = this._minutesFromStartOfWeek(this._cal)
		let currentWindow = this._timeWindows[this._find(minuteOfWeek)]
		let newMinuteOfWeek = this._endMinuteOfWeek(currentWindow)
		if (newMinuteOfWeek === WeeklyTimeWindow.WEEK) {
			newMinuteOfWeek = (this._isFirstAndLastSame ? this._endMinuteOfWeek(this._timeWindows[0]) : 0)
		}
		
		newMinuteOfWeek = this._advanceCalendar(minuteOfWeek, newMinuteOfWeek)
		return {
			status : currentWindow.status,
			until: this._cal.valueOf()
		}
	}
	
	/**
	 * @param oldMinuteOfWeek   Integer
	 * @param newMinuteOfWeek   Integer
	 * @return Integer
	 */
	_advanceCalendar(oldMinuteOfWeek, newMinuteOfWeek) {
		let minutesToAdvance = newMinuteOfWeek - oldMinuteOfWeek
		if (minutesToAdvance < 0) {
			minutesToAdvance += WeeklyTimeWindow.WEEK
		}
		
		// The craziness ahead is required to support DST (causing some dates to be invalid)
		let targetDate = new Period({
			days : this._cal.date(),
			hours : this._cal.hour(),
			minutes : this._cal.minute()
		}).plusMinutes(minutesToAdvance).normalizedStandard()
		
		while (true) {
			this._cal.date(targetDate.getDays())
			this._cal.hour(targetDate.getHours())
			this._cal.minute(targetDate.getMinutes())
			this._cal.second(0)
			this._cal.millisecond(0)
			
			if ((this._cal.hour() === targetDate.getHours()) && (this._cal.minute() === targetDate.getMinutes())) {
				break
			}
			
			targetDate = targetDate.plusMinutes(1).normalizedStandard()
			++newMinuteOfWeek
		}
		
		return newMinuteOfWeek
	}
	
	
	/**
	 * @param minuteOfWeek   Integer
	 * @return Integer index in _timeWindows member
	 */
	_find(minuteOfWeek) {
		// _timeWindows are assumed to be sorted, so we can use binary search
		let low = 0
		let high = this._timeWindows.length
		
		while (low < high) {
			let mid = (low + high) >>> 1
			let midValue = this._endMinuteOfWeek(this._timeWindows[mid])
			if (midValue <= minuteOfWeek) {
				low = mid + 1
			} else {
				high = mid
			}
		}
		
		return low
	}
	
	/**
	 * @param cal   Moment with tz
	 * @return Integer
	 */
	_minutesFromStartOfWeek(cal) {
		return (cal.day() - WeeklyTimeWindow.SUNDAY) * WeeklyTimeWindow.DAY +
			cal.hour() * WeeklyTimeWindow.HOUR +
			cal.minute()
	}
}
