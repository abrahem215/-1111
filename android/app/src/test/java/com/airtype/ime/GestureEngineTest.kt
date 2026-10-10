package com.airtype.ime

import org.junit.Assert.*
import org.junit.Test

class GestureEngineTest {

    @Test
    fun testCursorSmoothingFilter() {
        val filter = AndroidEMACursorFilter(0.5f)
        val p1 = filter.filter(1.0f, 1.0f)
        assertEquals(1.0f, p1.x, 0.001f)
        assertEquals(1.0f, p1.y, 0.001f)

        val p2 = filter.filter(0.0f, 0.0f)
        assertEquals(0.5f, p2.x, 0.001f)
        assertEquals(0.5f, p2.y, 0.001f)
    }

    @Test
    fun testPinchConfirmationAndRepeatPrevention() {
        val engine = AndroidGestureEngine(
            pinchThreshold = 0.05f,
            releaseThreshold = 0.08f,
            minHoldMs = 50L,
            cooldownMs = 200L
        )

        var time = 1000L
        val pinchHand = AndroidHandResult(
            detected = true,
            indexTip = NormalizedPoint(0.5f, 0.5f),
            thumbTip = NormalizedPoint(0.5f, 0.53f),
            pinchDistance = 0.03f, // under threshold
            isOpenPalm = false
        )

        // Frame 1: potential pinch begins
        val out1 = engine.process(pinchHand, time)
        assertEquals(AndroidGestureState.PINCH_POTENTIAL, out1.state)
        assertFalse(out1.clickEmitted)

        // Advance past minHoldMs
        time += 60L
        // Frame 2: pinch confirmed, click emitted!
        val out2 = engine.process(pinchHand, time)
        assertTrue(out2.clickEmitted)
        assertEquals(AndroidGestureState.WAIT_RELEASE, out2.state)

        // Subsequent frames while pinch is STILL held: must suppress repeat clicks!
        for (i in 1..5) {
            time += 20L
            val outHold = engine.process(pinchHand, time)
            assertFalse("Repeated click must not fire while pinch is held", outHold.clickEmitted)
            assertEquals(AndroidGestureState.WAIT_RELEASE, outHold.state)
        }

        // Release fingers
        val releasedHand = pinchHand.copy(pinchDistance = 0.09f)
        val outRel = engine.process(releasedHand, time + 20L)
        assertEquals(AndroidGestureState.IDLE, outRel.state)
        assertFalse(outRel.clickEmitted)
    }

    @Test
    fun testOpenPalmPausesTyping() {
        val engine = AndroidGestureEngine()
        val palmHand = AndroidHandResult(
            detected = true,
            indexTip = NormalizedPoint(0.5f, 0.5f),
            thumbTip = NormalizedPoint(0.5f, 0.52f),
            pinchDistance = 0.02f,
            isOpenPalm = true
        )

        val out = engine.process(palmHand)
        assertEquals(AndroidGestureState.PALM_PAUSED, out.state)
        assertFalse(out.clickEmitted)
    }

    @Test
    fun testEmergencyStopHaltsImmediately() {
        val engine = AndroidGestureEngine()
        engine.triggerEmergencyStop()

        val pinchHand = AndroidHandResult(
            detected = true,
            indexTip = NormalizedPoint(0.5f, 0.5f),
            thumbTip = NormalizedPoint(0.5f, 0.52f),
            pinchDistance = 0.02f,
            isOpenPalm = false
        )

        val out = engine.process(pinchHand)
        assertEquals(AndroidGestureState.EMERGENCY_STOPPED, out.state)
        assertFalse(out.clickEmitted)
    }
}
