import os
import importlib.util
import asyncio

print("使用前请根据doc/performance_testerer.md的说明准备配置。")


def list_performance_tester_modules():
    performance_tester_dir = os.path.join(
        os.path.dirname(__file__), "performance_tester"
    )
    modules = []
    for file in os.listdir(performance_tester_dir):
        if file.endswith(".py"):
            modules.append(file[:-3])
    return modules


async def load_and_execute_module(module_name):
    module_path = os.path.join(
        os.path.dirname(__file__), "performance_tester", f"{module_name}.py"
    )
    spec = importlib.util.spec_from_file_location(module_name, module_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    if hasattr(module, "main"):
        main_func = module.main
        if asyncio.iscoroutinefunction(main_func):
            await main_func()
        else:
            print("\n⚠️ 没有可用的LLM模块进行测试。")

        tts_table = []
        for name, data in self.results["tts"].items():
            if data["errors"] == 0:
                tts_table.append([name, f"{data['avg_time']:.3f}秒"])  # 不需要固定宽度

        if tts_table:
            print("\nTTS 性能排行:\n")
            print(
                tabulate(
                    tts_table,
                    headers=["模型名称", "合成耗时"],
                    tablefmt="github",
                    colalign=("left", "right"),
                    disable_numparse=True,
                )
            )
        else:
            print("\n⚠️ 没有可用的TTS模块进行测试。")

        stt_table = []
        for name, data in self.results["stt"].items():
            if data["errors"] == 0:
                stt_table.append([name, f"{data['avg_time']:.3f}秒"])  # 不需要固定宽度

        if stt_table:
            print("\nSTT 性能排行:\n")
            print(
                tabulate(
                    stt_table,
                    headers=["模型名称", "合成耗时"],
                    tablefmt="github",
                    colalign=("left", "right"),
                    disable_numparse=True,
                )
            )
        else:
            print("\n⚠️ 没有可用的STT模块进行测试。")

        if self.results["combinations"]:
            print("\n推荐配置组合 (得分越小越好):\n")
            combo_table = []
            for combo in self.results["combinations"][:]:
                combo_table.append(
                    [
                        f"{combo['llm']} + {combo['tts']} + {combo['stt']}",  # 不需要固定宽度
                        f"{combo['score']:.3f}",
                        f"{combo['details']['llm_first_token']:.3f}秒",
                        f"{combo['details']['llm_stability']:.3f}",
                        f"{combo['details']['tts_time']:.3f}秒",
                        f"{combo['details']['stt_time']:.3f}秒",
                    ]
                )

            print(
                tabulate(
                    combo_table,
                    headers=[
                        "组合方案",
                        "综合得分",
                        "LLM首字耗时",
                        "稳定性",
                        "TTS合成耗时",
                        "STT合成耗时",
                    ],
                    tablefmt="github",
                    colalign=("left", "right", "right", "right", "right", "right"),
                    disable_numparse=True,
                )
            )
        else:
            print("\n⚠️ 没有可用的模块组合建议。")

    def _process_results(self, all_results):
        """处理测试结果"""
        for result in all_results:
            if result["errors"] == 0:
                if result["type"] == "llm":
                    self.results["llm"][result["name"]] = result
                elif result["type"] == "tts":
                    self.results["tts"][result["name"]] = result
                elif result["type"] == "stt":
                    self.results["stt"][result["name"]] = result
                else:
                    pass

    async def run(self):
        """执行全量异步测试"""
        print("🔍 开始筛选可用模块...")
        
        # 添加调试信息
        print(f"📊 配置调试信息:")
        print(f"   LLM配置: {list(self.config.get('LLM', {}).keys()) if self.config.get('LLM') else 'None'}")
        print(f"   TTS配置: {list(self.config.get('TTS', {}).keys()) if self.config.get('TTS') else 'None'}")
        print(f"   ASR配置: {list(self.config.get('ASR', {}).keys()) if self.config.get('ASR') else 'None'}")
        
        # 如果有LLM配置，显示详细信息
        if self.config.get("LLM"):
            for llm_name, config in self.config.get("LLM", {}).items():
                print(f"   LLM {llm_name} 配置:")
                if "api_key" in config:
                    api_key = config["api_key"]
                    # 隐藏API密钥的大部分内容，只显示前后几位
                    if len(api_key) > 10:
                        masked_key = api_key[:4] + "***" + api_key[-4:]
                    else:
                        masked_key = "***"
                    print(f"     api_key: {masked_key}")
                else:
                    print(f"     配置: {config}")

        # 创建所有测试任务
        all_tasks = []

        # LLM测试任务
        if self.config.get("LLM") is not None:
            for llm_name, config in self.config.get("LLM", {}).items():
                # 检查配置有效性
                if llm_name == "CozeLLM":
                    if any(x in config.get("bot_id", "") for x in ["你的"]) or any(
                        x in config.get("user_id", "") for x in ["你的"]
                    ):
                        print(f"⏭️  LLM {llm_name} 未配置bot_id/user_id，已跳过")
                        continue
                elif "api_key" in config and any(
                    x in config["api_key"] for x in ["你的", "placeholder", "sk-xxx"]
                ):
                    print(f"⏭️  LLM {llm_name} 未配置api_key，已跳过")
                    continue

                # 对于Ollama，先检查服务状态
                if llm_name == "Ollama":
                    base_url = config.get("base_url", "http://localhost:11434")
                    model_name = config.get("model_name")
                    if not model_name:
                        print(f"🚫 Ollama未配置model_name")
                        continue

                    if not await self._check_ollama_service(base_url, model_name):
                        continue

                print(f"📋 添加LLM测试任务: {llm_name}")
                module_type = config.get("type", llm_name)
                llm = create_llm_instance(module_type, config)

                # 为每个句子创建独立任务
                for sentence in self.test_sentences:
                    sentence = sentence.encode("utf-8").decode("utf-8")
                    all_tasks.append(
                        self._test_single_sentence(llm_name, llm, sentence)
                    )

        # TTS测试任务
        if self.config.get("TTS") is not None:
            for tts_name, config in self.config.get("TTS", {}).items():
                token_fields = ["access_token", "api_key", "token"]
                if any(
                    field in config
                    and any(x in config[field] for x in ["你的", "placeholder"])
                    for field in token_fields
                ):
                    print(f"⏭️  TTS {tts_name} 未配置access_token/api_key，已跳过")
                    continue
                print(f"🎵 添加TTS测试任务: {tts_name}")
                all_tasks.append(self._test_tts(tts_name, config))

        # STT测试任务
        if len(self.test_wav_list) >= 1:
            if self.config.get("ASR") is not None:
                for stt_name, config in self.config.get("ASR", {}).items():
                    token_fields = ["access_token", "api_key", "token"]
                    if any(
                        field in config
                        and any(x in config[field] for x in ["你的", "placeholder"])
                        for field in token_fields
                    ):
                        print(f"⏭️  ASR {stt_name} 未配置access_token/api_key，已跳过")
                        continue
                    print(f"🎵 添加ASR测试任务: {stt_name}")
                    all_tasks.append(self._test_stt(stt_name, config))
        else:
            print(f"\n⚠️  {self.wav_root} 路径下没有音频文件，已跳过STT测试任务")

        print(
            f"\n✅ 找到 {len([t for t in all_tasks if 'test_single_sentence' in str(t)]) / len(self.test_sentences):.0f} 个可用LLM模块"
        )
        print(
            f"✅ 找到 {len([t for t in all_tasks if '_test_tts' in str(t)])} 个可用TTS模块"
        )
        print(
            f"✅ 找到 {len([t for t in all_tasks if '_test_stt' in str(t)])} 个可用STT模块"
        )
        print("\n⏳ 开始并发测试所有模块...\n")

        # 并发执行所有测试任务
        all_results = await asyncio.gather(*all_tasks, return_exceptions=True)

        # 处理LLM结果
        llm_results = {}
        for result in [
            r
            for r in all_results
            if r and isinstance(r, dict) and r.get("type") == "llm"
        ]:
            llm_name = result["name"]
            if llm_name not in llm_results:
                llm_results[llm_name] = {
                    "name": llm_name,
                    "type": "llm",
                    "first_token_times": [],
                    "response_times": [],
                    "errors": 0,
                }
            llm_results[llm_name]["first_token_times"].append(
                result["first_token_time"]
            )
            llm_results[llm_name]["response_times"].append(result["response_time"])

        # 计算LLM平均值和标准差
        for llm_name, data in llm_results.items():
            if len(data["first_token_times"]) >= len(self.test_sentences) * 0.5:
                self.results["llm"][llm_name] = {
                    "name": llm_name,
                    "type": "llm",
                    "avg_response": sum(data["response_times"])
                    / len(data["response_times"]),
                    "avg_first_token": sum(data["first_token_times"])
                    / len(data["first_token_times"]),
                    "std_first_token": (
                        statistics.stdev(data["first_token_times"])
                        if len(data["first_token_times"]) > 1
                        else 0
                    ),
                    "std_response": (
                        statistics.stdev(data["response_times"])
                        if len(data["response_times"]) > 1
                        else 0
                    ),
                    "errors": 0,
                }

        # 处理TTS结果
        for result in [
            r
            for r in all_results
            if r and isinstance(r, dict) and r.get("type") == "tts"
        ]:
            if result["errors"] == 0:
                self.results["tts"][result["name"]] = result

        # 处理STT结果
        for result in [
            r
            for r in all_results
            if r and isinstance(r, dict) and r.get("type") == "stt"
        ]:
            if result["errors"] == 0:
                self.results["stt"][result["name"]] = result

        # 生成组合建议并打印结果
        print("\n📊 生成测试报告...")
        self._generate_combinations()
        self._print_results()


async def main():
    tester = AsyncPerformanceTester()
    await tester.run()


if __name__ == "__main__":
    main()
