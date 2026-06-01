const fs = require('fs');
const vm = require('vm');

const codePath = process.argv[2];
const rawCode = fs.readFileSync(codePath, 'utf8');

const transformedCode = rawCode
    .replace(/\blet\s+/g, 'var ')
    .replace(/\bconst\s+/g, 'var ');

const sandbox = { 
    console: { log: () => {} },
    result_data: []
};
vm.createContext(sandbox);

const instrumentedCode = transformedCode.split('\n').map((line, idx) => {
    const t = line.trim();
    // 빈 줄, 주석, 중괄호 등 추적 코드를 넣으면 문법이 깨지는 줄은 안전하게 건너뜁니다.
    if (!t || t.startsWith('//') || t === '{' || t === '}' || t === 'else {') {
        return line;
    }
    
    return `;(function() {
        var snapshot = {};
        for (var key in this) {
            if (key !== 'console' && key !== 'result_data' && key !== 'setTimeout' && key !== 'setInterval') {
                snapshot[key] = String(this[key]);
            }
        }
        result_data.push({step: ${idx}, line: ${idx+1}, vars: snapshot});
    }).call(this);\n${line}`;
}).join('\n');

try {
    vm.runInContext(instrumentedCode, sandbox);
} catch (err) {
    // 🌟 핵심: 추적 중 에러가 발생하면 무시하지 않고 변수 창에 원인을 띄워줍니다!
    sandbox.result_data.push({step: 0, line: 0, vars: { "문법_분석_에러": err.message }});
} finally {
    console.log(JSON.stringify({ status: "success", frames: sandbox.result_data }));
}