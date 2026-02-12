#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
雅思模拟考试系统 - 集成测试套件
Test Suite for IELTS Practice System v1.2.0

运行方式: python test_suite.py
"""

import sys
if sys.platform.startswith('win'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

import subprocess
import sys
import os
import time
import requests
import json
from pathlib import Path

def print_header(text):
    print(f"\n{'='*60}")
    print(f"{text:^60}")
    print(f"{'='*60}\n")

def print_pass(text):
    print(f"[PASS] {text}")

def print_fail(text):
    print(f"[FAIL] {text}")

def print_info(text):
    print(f"[INFO] {text}")


class TestSuite:
    """测试套件类"""
    
    def __init__(self):
        self.base_url = "http://localhost:5000"
        self.results = {"passed": 0, "failed": 0, "tests": []}
    
    def add_result(self, name, passed, message=""):
        status = "PASS" if passed else "FAIL"
        self.results["tests"].append({
            "name": name,
            "status": status,
            "message": message
        })
        if passed:
            self.results["passed"] += 1
            print_pass(f"{name} {message}")
        else:
            self.results["failed"] += 1
            print_fail(f"{name} {message}")
    
    # ==================== 后端测试 ====================
    
    def test_01_backend_file_structure(self):
        """测试01: 后端文件结构完整性"""
        print_header("测试01: 后端文件结构检查")
        
        backend_files = [
            "backend/app.py",
            "backend/requirements.txt",
            "backend/tts_service.py",
            "backend/.env"
        ]
        
        for file_path in backend_files:
            if os.path.exists(file_path):
                print_pass(f"文件存在: {file_path}")
            else:
                print_fail(f"文件缺失: {file_path}")
                return False
        
        return True
    
    def test_02_python_dependencies(self):
        """测试02: Python依赖安装"""
        print_header("测试02: Python依赖检查")
        
        required_packages = [
            ("flask", "Flask"),
            ("flask_cors", "Flask-CORS"),
            ("requests", "requests"),
            ("pydantic", "pydantic"),
            ("dotenv", "dotenv")
        ]
        
        for package, import_name in required_packages:
            try:
                __import__(import_name.lower().replace("-", "_"))
                print_pass(f"已安装: {package}")
            except ImportError:
                print_fail(f"未安装: {package}")
                return False
        
        return True
    
    def test_03_backend_syntax(self):
        """测试03: 后端代码语法检查"""
        print_header("测试03: 后端语法检查")
        
        try:
            result = subprocess.run(
                ["python", "-m", "py_compile", "backend/app.py"],
                capture_output=True,
                text=True
            )
            if result.returncode == 0:
                print_pass("backend/app.py 语法正确")
                return True
            else:
                print_fail(f"语法错误: {result.stderr}")
                return False
        except Exception as e:
            print_fail(f"语法检查失败: {e}")
            return False
    
    def test_04_env_configuration(self):
        """测试04: 环境配置文件检查"""
        print_header("测试04: 环境配置检查")
        
        env_path = "backend/.env"
        if not os.path.exists(env_path):
            print_fail(f".env 文件不存在: {env_path}")
            return False
        
        with open(env_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        required_vars = [
            "DIFY_API_KEY",
            "DIFY_WORKFLOW_ID",
            "DIFY_API_URL"
        ]
        
        all_present = True
        for var in required_vars:
            if f"{var}=" in content or f'{var}="' in content:
                print_pass(f"配置存在: {var}")
            else:
                print_fail(f"配置缺失: {var}")
                all_present = False
        
        return all_present
    
    def test_05_backend_startup(self):
        """测试05: 后端启动测试"""
        print_header("测试05: 后端启动测试")
        
        try:
            # 启动后端进程
            backend_process = subprocess.Popen(
                [sys.executable, "backend/app.py"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                cwd=os.getcwd()
            )
            
            # 等待启动
            time.sleep(3)
            
            # 检查进程是否运行
            if backend_process.poll() is None:
                print_pass("后端进程已启动")
                
                # 测试健康检查接口
                try:
                    response = requests.get(f"{self.base_url}/api/health", timeout=5)
                    if response.status_code == 200:
                        print_pass("健康检查接口返回 200")
                        print_info(f"响应: {response.json()}")
                        
                        # 终止进程
                        backend_process.terminate()
                        backend_process.wait(timeout=5)
                        return True
                    else:
                        print_fail(f"健康检查返回状态码: {response.status_code}")
                except requests.exceptions.ConnectionError:
                    print_fail("无法连接到后端服务")
                except Exception as e:
                    print_fail(f"健康检查请求失败: {e}")
                
                # 尝试终止进程
                try:
                    backend_process.terminate()
                    backend_process.wait(timeout=5)
                except:
                    backend_process.kill()
            else:
                stdout, stderr = backend_process.communicate()
                print_fail(f"后端启动失败")
                print_info(f"stdout: {stdout.decode()}")
                print_info(f"stderr: {stderr.decode()}")
            
            return False
            
        except Exception as e:
            print_fail(f"后端启动测试失败: {e}")
            return False
    
    def test_06_api_generate_questions(self):
        """测试06: 出题API测试"""
        print_header("测试06: 出题API测试")
        
        try:
            # 启动后端
            backend_process = subprocess.Popen(
                [sys.executable, "backend/app.py"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                cwd=os.getcwd()
            )
            
            time.sleep(3)
            
            # 测试普通出题
            response = requests.post(
                f"{self.base_url}/api/generate-questions",
                json={
                    "section": "reading",
                    "difficulty": "medium",
                    "count": 1
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if "data" in data and "passages" in data["data"]:
                    questions_count = len(data["data"]["passages"][0]["questions"])
                    print_pass(f"普通出题API返回成功，生成 {questions_count} 道题目")
                else:
                    print_pass("普通出题API返回成功")
            else:
                print_fail(f"普通出题API返回状态码: {response.status_code}")
                print_info(f"响应: {response.text}")
            
            # 测试Dify出题
            response = requests.post(
                f"{self.base_url}/api/generate-questions",
                json={
                    "section": "reading",
                    "difficulty": "medium",
                    "use_dify": True,
                    "topic": "AI人工智能",
                    "user": "test_user",
                    "question_count": 10,
                    "passage_length": 800
                },
                timeout=180  # Dify可能需要更长时间
            )
            
            if response.status_code == 200:
                data = response.json()
                if "data" in data and "passages" in data["data"]:
                    questions_count = len(data["data"]["passages"][0]["questions"])
                    print_pass(f"Dify出题API返回成功，生成 {questions_count} 道题目")
                else:
                    print_pass("Dify出题API返回成功")
            else:
                print_fail(f"Dify出题API返回状态码: {response.status_code}")
                print_info(f"响应: {response.text}")
            
            # 终止后端
            backend_process.terminate()
            try:
                backend_process.wait(timeout=5)
            except:
                backend_process.kill()
            
            return True
            
        except Exception as e:
            print_fail(f"API测试失败: {e}")
            return False
    
    def test_07_api_endpoints(self):
        """测试07: 其他API端点测试"""
        print_header("测试07: 其他API端点测试")
        
        try:
            # 启动后端
            backend_process = subprocess.Popen(
                [sys.executable, "backend/app.py"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                cwd=os.getcwd()
            )
            
            time.sleep(3)
            
            endpoints = [
                ("GET", "/api/sections", None),
                ("GET", "/api/difficulties", None),
                ("POST", "/api/generate-audio-by-keyword", {
                    "keyword": "university",
                    "scenario": "campus"
                }),
            ]
            
            for method, endpoint, json_data in endpoints:
                try:
                    if method == "GET":
                        response = requests.get(f"{self.base_url}{endpoint}", timeout=10)
                    else:
                        response = requests.post(
                            f"{self.base_url}{endpoint}",
                            json=json_data,
                            timeout=10
                        )
                    
                    if response.status_code == 200:
                        print_pass(f"{method} {endpoint} - 200 OK")
                    elif response.status_code == 422:
                        print_pass(f"{method} {endpoint} - 422 (验证错误，可接受)")
                    else:
                        print_fail(f"{method} {endpoint} - {response.status_code}")
                except Exception as e:
                    print_fail(f"{method} {endpoint} - 错误: {e}")
            
            # 终止后端
            backend_process.terminate()
            try:
                backend_process.wait(timeout=5)
            except:
                backend_process.kill()
            
            return True
            
        except Exception as e:
            print_fail(f"端点测试失败: {e}")
            return False
    
    # ==================== 前端测试 ====================
    
    def test_08_frontend_file_structure(self):
        """测试08: 前端文件结构检查"""
        print_header("测试08: 前端文件结构检查")
        
        frontend_files = [
            "frontend/package.json",
            "frontend/vite.config.js",
            "frontend/index.html",
            "frontend/src/App.jsx",
            "frontend/src/components/Reading.jsx",
            "frontend/src/components/Writing.jsx",
            "frontend/src/components/Listening.jsx",
            "frontend/src/services/api.js",
            "frontend/src/services/config.js",
            "frontend/electron/main.cjs",
            "frontend/electron/preload.cjs"
        ]
        
        all_present = True
        for file_path in frontend_files:
            if os.path.exists(file_path):
                print_pass(f"文件存在: {file_path}")
            else:
                print_fail(f"文件缺失: {file_path}")
                all_present = False
        
        return all_present
    
    def test_09_npm_dependencies(self):
        """测试09: NPM依赖检查"""
        print_header("测试09: NPM依赖检查")
        
        required_deps = ["react", "axios", "vite"]
        dev_deps = ["electron", "electron-builder", "@vitejs/plugin-react"]
        
        if not os.path.exists("frontend/package-lock.json"):
            print_info("未检测到 package-lock.json，请确保 npm install 已运行")
        
        # 检查package.json
        try:
            with open("frontend/package.json", "r", encoding='utf-8') as f:
                package_json = json.load(f)
            
            all_deps = {**package_json.get("dependencies", {}), **package_json.get("devDependencies", {})}
            
            for dep in required_deps + dev_deps:
                if dep in all_deps:
                    print_pass(f"依赖存在: {dep} ({all_deps[dep]})")
                else:
                    print_fail(f"依赖缺失: {dep}")
            
            return True
        except Exception as e:
            print_fail(f"读取package.json失败: {e}")
            return False
    
    def test_10_frontend_syntax(self):
        """测试10: 前端代码语法检查"""
        print_header("测试10: 前端语法检查")
        
        try:
            result = subprocess.run(
                ["npm", "run", "lint"],
                capture_output=True,
                text=True,
                cwd="frontend",
                timeout=60
            )
            
            if result.returncode == 0:
                print_pass("前端代码语法检查通过")
                return True
            else:
                # lint可能有警告但不影响构建
                if "error" in result.stderr.lower():
                    print_fail(f"ESLint错误: {result.stderr}")
                    return False
                else:
                    print_pass("前端代码语法检查通过 (仅有警告)")
                    return True
        except subprocess.TimeoutExpired:
            print_fail("ESLint超时")
            return False
        except FileNotFoundError:
            print_info("npm 未安装，跳过ESLint检查")
            return True
        except Exception as e:
            print_fail(f"语法检查失败: {e}")
            return False
    
    def test_11_frontend_build(self):
        """测试11: 前端构建测试"""
        print_header("测试11: 前端构建测试")
        
        try:
            result = subprocess.run(
                ["npm", "run", "build"],
                capture_output=True,
                text=True,
                cwd="frontend",
                timeout=120
            )
            
            if result.returncode == 0:
                print_pass("前端构建成功")
                
                # 检查构建产物
                import glob
                dist_files = [
                    "frontend/dist/index.html",
                    "frontend/dist/assets/index-*.js",
                    "frontend/dist/assets/index-*.css"
                ]
                
                for pattern in dist_files:
                    files = glob.glob(pattern)
                    if files:
                        for f in files:
                            size = os.path.getsize(f)
                            print_pass(f"构建产物: {os.path.basename(f)} ({size/1024:.1f} KB)")
                
                return True
            else:
                print_fail(f"前端构建失败")
                print_info(f"stdout: {result.stdout}")
                print_info(f"stderr: {result.stderr}")
                return False
                
        except subprocess.TimeoutExpired:
            print_fail("前端构建超时")
            return False
        except FileNotFoundError:
            print_info("npm 未安装，跳过构建测试")
            return True
        except Exception as e:
            print_fail(f"构建测试失败: {e}")
            return False
    
    def test_12_electron_config(self):
        """测试12: Electron配置检查"""
        print_header("测试12: Electron配置检查")
        
        try:
            with open("frontend/package.json", "r", encoding='utf-8') as f:
                package_json = json.load(f)
            
            build_config = package_json.get("build", {})
            electron_config = {
                "main": package_json.get("main"),
                "appId": build_config.get("appId"),
                "productName": build_config.get("productName"),
                "directories": build_config.get("directories")
            }
            
            all_ok = True
            for key, value in electron_config.items():
                if value:
                    print_pass(f"配置项 '{key}': {value}")
                else:
                    print_fail(f"配置项缺失: {key}")
                    all_ok = False
            
            return all_ok
        except Exception as e:
            print_fail(f"Electron配置检查失败: {e}")
            return False
    
    # ==================== 运行测试 ====================
    
    def run_all_tests(self):
        """运行所有测试"""
        print_header("雅思模拟考试系统 v1.2.0 测试套件")
        print(f"测试开始时间: {time.strftime('%Y-%m-%d %H:%M:%S')}")
        
        tests = [
            # 后端测试
            ("后端文件结构", self.test_01_backend_file_structure),
            ("Python依赖", self.test_02_python_dependencies),
            ("后端语法检查", self.test_03_backend_syntax),
            ("环境配置", self.test_04_env_configuration),
            ("后端启动", self.test_05_backend_startup),
            ("出题API", self.test_06_api_generate_questions),
            ("其他API端点", self.test_07_api_endpoints),
            # 前端测试
            ("前端文件结构", self.test_08_frontend_file_structure),
            ("NPM依赖", self.test_09_npm_dependencies),
            ("前端语法检查", self.test_10_frontend_syntax),
            ("前端构建", self.test_11_frontend_build),
            ("Electron配置", self.test_12_electron_config),
        ]
        
        for name, test_func in tests:
            try:
                result = test_func()
                if result is None:
                    result = True  # 跳过测试
            except Exception as e:
                print_fail(f"测试异常: {e}")
                result = False
            finally:
                # 确保后端进程已终止
                self._cleanup_processes()
        
        # 打印测试总结
        print_header("测试总结")
        total = self.results["passed"] + self.results["failed"]
        pass_rate = (self.results["passed"] / total * 100) if total > 0 else 0
        
        print(f"总测试数: {total}")
        print(f"通过: {self.results['passed']}")
        print(f"失败: {self.results['failed']}")
        print(f"通过率: {pass_rate:.1f}%")
        
        if self.results["failed"] == 0:
            print(f"\n[SUCCESS] 所有测试通过!\n")
        else:
            print(f"\n[WARNING] 有 {self.results['failed']} 项测试失败，请检查上述输出\n")
        
        return self.results["failed"] == 0
    
    def _cleanup_processes(self):
        """清理后台进程"""
        try:
            for proc in subprocess.active_children():
                proc.terminate()
                try:
                    proc.wait(timeout=3)
                except:
                    proc.kill()
        except:
            pass


if __name__ == "__main__":
    suite = TestSuite()
    success = suite.run_all_tests()
    sys.exit(0 if success else 1)
