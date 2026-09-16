import unittest

from calibrate_voice_threshold import calibrate, rates_at_threshold


class CalibrationTests(unittest.TestCase):
    def test_rates_use_greater_or_equal_as_acceptance(self):
        rates = rates_at_threshold([0.8, 0.9], [0.2, 0.8], 0.8, 1.0, 10.0, 0.5)
        self.assertEqual(rates.false_reject_rate, 0.0)
        self.assertEqual(rates.false_accept_rate, 0.5)

    def test_calibration_separates_clean_trials(self):
        eer, min_dcf = calibrate([0.82, 0.88, 0.91], [0.1, 0.2, 0.35])
        self.assertGreater(eer.threshold, 0.35)
        self.assertLessEqual(eer.threshold, 0.82)
        self.assertEqual(eer.false_accept_rate, 0.0)
        self.assertEqual(eer.false_reject_rate, 0.0)
        self.assertEqual(min_dcf.detection_cost, 0.0)


if __name__ == "__main__":
    unittest.main()

