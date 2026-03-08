#!/usr/bin/env python3
"""
Backend API Testing for PRA-GATI Quant Trading Dashboard
Tests all endpoints specified in the review request
"""

import requests
import sys
import json
from datetime import datetime

class QuantTradingAPITester:
    def __init__(self, base_url="https://quant-engine-15.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        result = {
            "test_name": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}: {details}")

    def run_test(self, name, method, endpoint, expected_status=200, expected_fields=None):
        """Run a single API test"""
        url = f"{self.base_url}{endpoint}"
        
        try:
            if method == 'GET':
                response = requests.get(url, timeout=30)
            elif method == 'POST':
                response = requests.post(url, timeout=30)
            else:
                self.log_test(name, False, f"Unsupported method: {method}")
                return False, {}

            success = response.status_code == expected_status
            
            if success:
                try:
                    data = response.json()
                    
                    # Check expected fields if provided
                    if expected_fields:
                        for field in expected_fields:
                            if field not in data:
                                success = False
                                self.log_test(name, False, f"Missing field '{field}' in response")
                                return False, data
                    
                    self.log_test(name, True, f"Status: {response.status_code}, Response type: {type(data).__name__}")
                    return True, data
                except json.JSONDecodeError:
                    self.log_test(name, False, f"Status: {response.status_code}, Invalid JSON response")
                    return False, {}
            else:
                self.log_test(name, False, f"Expected {expected_status}, got {response.status_code}")
                return False, {}

        except requests.exceptions.Timeout:
            self.log_test(name, False, "Request timeout (30s)")
            return False, {}
        except requests.exceptions.ConnectionError:
            self.log_test(name, False, "Connection error - backend may be down")
            return False, {}
        except Exception as e:
            self.log_test(name, False, f"Error: {str(e)}")
            return False, {}

    def test_health_endpoint(self):
        """Test GET /api/health returns {status: 'ok'}"""
        success, data = self.run_test(
            "Health Check",
            "GET",
            "/api/health",
            200,
            ["status"]
        )
        
        if success and data.get("status") == "ok":
            self.log_test("Health Status Validation", True, "Status is 'ok'")
            return True
        elif success:
            self.log_test("Health Status Validation", False, f"Status is '{data.get('status')}', expected 'ok'")
            return False
        return False

    def test_universe_endpoint(self):
        """Test GET /api/universe returns {count: number, symbols: array}"""
        success, data = self.run_test(
            "Universe Endpoint",
            "GET",
            "/api/universe",
            200,
            ["count", "symbols"]
        )
        
        if success:
            count = data.get("count", 0)
            symbols = data.get("symbols", [])
            
            if isinstance(count, int) and isinstance(symbols, list):
                self.log_test("Universe Data Validation", True, f"Count: {count}, Symbols: {len(symbols)} items")
                
                # Check if we have the expected 206 symbols
                if len(symbols) == 206:
                    self.log_test("Universe Symbol Count", True, "Exactly 206 symbols as expected")
                else:
                    self.log_test("Universe Symbol Count", False, f"Expected 206 symbols, got {len(symbols)}")
                
                return True
            else:
                self.log_test("Universe Data Validation", False, f"Invalid data types - count: {type(count)}, symbols: {type(symbols)}")
                return False
        return False

    def test_signals_endpoint(self):
        """Test GET /api/signals returns array of signal objects"""
        success, data = self.run_test(
            "Signals Endpoint",
            "GET",
            "/api/signals",
            200
        )
        
        if success and isinstance(data, list):
            if len(data) > 0:
                # Check first signal object structure
                signal = data[0]
                expected_fields = ["tradingsymbol", "strategy", "signal", "close", "rsi", "adx", "atr"]
                missing_fields = [field for field in expected_fields if field not in signal]
                
                if not missing_fields:
                    self.log_test("Signals Structure Validation", True, f"All expected fields present in {len(data)} signals")
                    return True
                else:
                    self.log_test("Signals Structure Validation", False, f"Missing fields: {missing_fields}")
                    return False
            else:
                self.log_test("Signals Data", True, "Empty signals array (may need to run engine first)")
                return True
        elif success:
            self.log_test("Signals Data Type", False, f"Expected array, got {type(data)}")
            return False
        return False

    def test_ranked_signals_endpoint(self):
        """Test GET /api/signals/ranked returns array with score field"""
        success, data = self.run_test(
            "Ranked Signals Endpoint",
            "GET",
            "/api/signals/ranked",
            200
        )
        
        if success and isinstance(data, list):
            if len(data) > 0:
                # Check if score field exists
                signal = data[0]
                if "score" in signal:
                    self.log_test("Ranked Signals Score Field", True, f"Score field present in {len(data)} ranked signals")
                    return True
                else:
                    self.log_test("Ranked Signals Score Field", False, "Missing 'score' field in ranked signals")
                    return False
            else:
                self.log_test("Ranked Signals Data", True, "Empty ranked signals array (may need to run engine first)")
                return True
        elif success:
            self.log_test("Ranked Signals Data Type", False, f"Expected array, got {type(data)}")
            return False
        return False

    def test_scan_endpoint(self):
        """Test GET /api/scan?top_n=10 returns scan results"""
        success, data = self.run_test(
            "Scanner Endpoint",
            "GET",
            "/api/scan?top_n=10",
            200,
            ["status", "universe_count", "signals_count", "returned_count", "results"]
        )
        
        if success:
            status = data.get("status")
            results = data.get("results", [])
            
            if status == "success" and isinstance(results, list):
                self.log_test("Scanner Response Validation", True, f"Status: {status}, Results: {len(results)} items")
                return True
            else:
                self.log_test("Scanner Response Validation", False, f"Invalid status or results format")
                return False
        return False

    def test_run_endpoint(self):
        """Test GET /api/run triggers engine"""
        success, data = self.run_test(
            "Run Engine Endpoint",
            "GET",
            "/api/run",
            200,
            ["status", "signals_count", "ranked_count"]
        )
        
        if success:
            status = data.get("status")
            signals_count = data.get("signals_count", 0)
            ranked_count = data.get("ranked_count", 0)
            
            if status == "success":
                self.log_test("Engine Run Validation", True, f"Status: {status}, Signals: {signals_count}, Ranked: {ranked_count}")
                return True
            else:
                self.log_test("Engine Run Validation", False, f"Status: {status}")
                return False
        return False

    def test_debug_endpoint(self):
        """Test GET /api/debug/RELIANCE returns debug data"""
        success, data = self.run_test(
            "Debug Endpoint (RELIANCE)",
            "GET",
            "/api/debug/RELIANCE",
            200
        )
        
        if success and isinstance(data, list):
            if len(data) > 0:
                # Check debug data structure
                debug_row = data[0]
                expected_fields = ["ts", "tradingsymbol", "close", "signal"]
                missing_fields = [field for field in expected_fields if field not in debug_row]
                
                if not missing_fields:
                    self.log_test("Debug Data Validation", True, f"Debug data with {len(data)} rows for RELIANCE")
                    return True
                else:
                    self.log_test("Debug Data Validation", False, f"Missing fields: {missing_fields}")
                    return False
            else:
                self.log_test("Debug Data", False, "Empty debug data for RELIANCE")
                return False
        elif success:
            self.log_test("Debug Data Type", False, f"Expected array, got {type(data)}")
            return False
        return False

    def test_debug_summary_endpoint(self):
        """Test GET /api/debug/RELIANCE/summary returns summary object"""
        success, data = self.run_test(
            "Debug Summary Endpoint (RELIANCE)",
            "GET",
            "/api/debug/RELIANCE/summary",
            200,
            ["vwlm_signal", "vb_signal", "symbol"]
        )
        
        if success:
            vwlm_signal = data.get("vwlm_signal")
            vb_signal = data.get("vb_signal")
            symbol = data.get("symbol")
            
            if symbol == "RELIANCE":
                self.log_test("Debug Summary Validation", True, f"Summary for {symbol}, VWLM: {vwlm_signal}, VB: {vb_signal}")
                return True
            else:
                self.log_test("Debug Summary Validation", False, f"Expected symbol 'RELIANCE', got '{symbol}'")
                return False
        return False

    def run_all_tests(self):
        """Run all backend API tests"""
        print("🚀 Starting PRA-GATI Backend API Tests")
        print(f"📡 Testing against: {self.base_url}")
        print("=" * 60)
        
        # Test all endpoints
        self.test_health_endpoint()
        self.test_universe_endpoint()
        self.test_signals_endpoint()
        self.test_ranked_signals_endpoint()
        self.test_scan_endpoint()
        self.test_run_endpoint()
        self.test_debug_endpoint()
        self.test_debug_summary_endpoint()
        
        # Print summary
        print("=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return 1

    def get_test_summary(self):
        """Get test summary for reporting"""
        return {
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "failed_tests": self.tests_run - self.tests_passed,
            "success_rate": (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0,
            "test_results": self.test_results
        }

def main():
    tester = QuantTradingAPITester()
    exit_code = tester.run_all_tests()
    
    # Save detailed results
    summary = tester.get_test_summary()
    with open("/app/backend_test_results.json", "w") as f:
        json.dump(summary, f, indent=2)
    
    return exit_code

if __name__ == "__main__":
    sys.exit(main())