
// https://stackoverflow.com/questions/67322922/context-preserving-eval

var __EVAL = s => eval(`void (__EVAL = ${__EVAL.toString()}); ${s}`);

async function evaluate(expr) {
	try {
		const result = await __EVAL(expr);
		console.log(expr, '===>', result)
	} catch (err) {
		console.log(expr, 'ERROR:', err.message)
	}
}

evaluate('var ten = 10')
evaluate('function cube(x) { return x ** 3 }')
evaluate('ten + cube(3)')
evaluate('let twenty = 20')
evaluate('twenty + 40')
evaluate('let title = ""')
evaluate('fetch("https://jsonplaceholder.typicode.com/todos/1").then(res => res.json()).then(obj => title = obj.title).then(() => evaluate("title"))')



