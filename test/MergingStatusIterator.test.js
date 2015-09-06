"use strict"

import chai from 'chai'
import {MergingStatusIterator} from "../src/MergingStatusIterator.js"
import {StatusIteratorTester} from "./StatusIteratorTester.js"
import {StatusListIterator} from "./StatusListIterator.js"
import * as Status from "../src/Status.js"
import moment from 'moment-timezone'

let should = chai.should()

describe("MergingStatusIterator", function() {
	function createTester({cal, statuses}) {
		cal = cal || null // Moment with tz
		statuses = statuses || [] // List<Status>

		return new StatusIteratorTester({
			it: new MergingStatusIterator({
				it: new StatusListIterator({
					statuses: statuses
				})
			}),
			cal: cal
		})
	}
	
    it ('returns a single status when given a single status', function() {
		let tester = createTester({
			statuses: [
				{
					status: Status.STATUS_AVAILABLE,
					until: null
				}			
			]
		})
		
		tester.assertLastStatus(Status.STATUS_AVAILABLE)
		tester.assertDone()
    })
	
    it ('returns two statuses when given two different statuses', function() {
		let cal = moment([2010, 12-1, 15, 0, 0, 0, 0])
		
		let tester = createTester({
			cal: cal,
			statuses: [
				{
					status: Status.STATUS_UNAVAILABLE,
					until: cal.valueOf()
				},
				{
					status: Status.STATUS_AVAILABLE,
					until: null
				}
			]
		})
		
		tester.assertNextStatus(Status.STATUS_UNAVAILABLE, "day", 0)
		tester.assertLastStatus(Status.STATUS_AVAILABLE)
		tester.assertDone()
    })
	
    it ('returns a single status when given two same statuses', function() {
		let cal = moment([2010, 12-1, 15, 0, 0, 0, 0])
		
		let tester = createTester({
			cal: cal,
			statuses: [
				{
					status: Status.STATUS_AVAILABLE,
					until: cal.valueOf()
				},
				{
					status: Status.STATUS_AVAILABLE,
					until: null
				}
			]
		})
		
		tester.assertLastStatus(Status.STATUS_AVAILABLE)
		tester.assertDone()
    })	
})
