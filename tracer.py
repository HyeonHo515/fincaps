import sys
import json
import argparse
import io

def trace_code(file_path, input_path):
    # 1. 코드 파일 읽기
    with open(file_path, 'r', encoding='utf-8') as f:
        user_code = f.read()
        
    # 2. 입력값(stdin) 파일 읽기
    with open(input_path, 'r', encoding='utf-8') as f:
        user_input = f.read()

    frames = []

    def tracer(frame, event, arg):
        if event == 'line':
            line_num = frame.f_lineno
            local_vars = {}
            for key, val in frame.f_locals.items():
                if not key.startswith('__'):
                    local_vars[key] = str(val)
            
            frames.append({
                "step": len(frames),
                "line": line_num,
                "vars": local_vars
            })
        return tracer

    global_env = {}
    
    # 🌟 출력을 가로채서 숨김 (자바에게 보낼 JSON 데이터와 섞이지 않도록)
    old_stdout = sys.stdout
    sys.stdout = io.StringIO()
    
    # 🌟 입력을 가로채서 미리 받아둔 텍스트를 던져줌 (input() 함수가 읽을 수 있도록)
    old_stdin = sys.stdin
    sys.stdin = io.StringIO(user_input)

    sys.settrace(tracer)
    try:
        exec(user_code, global_env)
    except Exception as e:
        pass
    finally:
        sys.settrace(None)
        # 입출력을 원래대로 복구
        sys.stdout = old_stdout
        sys.stdin = old_stdin

    result = {
        "status": "success",
        "frames": frames
    }
    
    # 🌟 자바에게 출력(print)하기 직전에 표준 출력을 강제로 UTF-8로 설정합니다.
    sys.stdout.reconfigure(encoding='utf-8')
    
    print(json.dumps(result, ensure_ascii=False))

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("filepath")
    parser.add_argument("inputpath") # 🌟 두 번째 인자(입력 파일 경로) 추가
    args = parser.parse_args()
    
    trace_code(args.filepath, args.inputpath)