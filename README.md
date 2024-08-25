# Promise
1. `Promise`是一个类，执行这个类的时候，传入一个执行器，这个执行器会立即执行。
2. `Promise`有三种状态，分别为：
    * `Pending` 等待
    * `Fulfilled` 完成
    * `Rejected` 拒绝
3. 状态只能由`Pending` -> `Rejected`，此时应有一个值，或`Pending` -> `Rejected`，此时应有一个原因，且状态发生改变后则不能二次更改。
4. `Promise`中使用`resolve`和`reject`两个函数来更改状态。
5. `then`方法里面做的事就是状态判断：
    * 如果状态是成功，则调用成功的回调函数
    * 如果状态是失败，则调用失败的回调函数
    
# 实现Promise：
## 一、实现简易版

### 1. 新建`MyPromise`类，传入执行器`executor`
```javascript
class MyPromise {
  // 构造方法中接收一个执行器
  constructor(executor) {
    // 执行器会立即执行
    executor();
  }
}
```
### 2. `executor`传入`resolve`和`reject`
```javascript
class MyPromise {
  // 构造方法中接收一个执行器
  constructor(executor) {
    // 执行器会立即执行，并传入resolve和reject方法
    executor(this.resolve, this.reject);
  }
  // resolve和reject使用箭头函数，便于在调用时，方法的this指向当前实例，若是普通函数，则会指向window或undefined
  // 更改成功后的状态
  resolve = () => {}
  // 更改失败后的状态
  reject = () => {}
}
```
### 3. 状态与结果管理
```javascript
// 定义三个全局变量
const PENDING = 'pending';
const FULFILLED = 'fulfilled';
const REJECTED = 'rejected';
class MyPromise {
  // 构造方法中接收一个执行器
  constructor(executor) {
    // 执行器会立即执行，并传入resolve和reject方法
    executor(this.resolve, this.reject);
  }
  // 存储状态的变量
  status = PENDING;
  // 存储成功后的值
  value = null;
  // 存储失败后的原因
  reason = null;
  // resolve和reject使用箭头函数，便于在调用时，方法的this指向当前实例，若是普通函数，则会指向window或undefined
  // 更改成功后的状态
  resolve = (value) => {
    // 只有状态为等待，才执行修改
    if (this.status === PENDING) {
      // 修改状态为成功
      this.status = FULFILLED;
      // 保存成功的值
      this.value = value;
    }
  }
  // 更改失败后的状态
  reject = (reason) => {
    // 只有状态为等待，才执行修改
    if (this.status === PENDING) {
      // 修改状态为rejected
      this.status = REJECTED;
      // 保存失败后的原因
      this.reason = reason;
    }
  }
}
```
### 4. `then`的简单实现
```js
then = (onFulfilled, onRejected) => {
  // 判断状态
  if (this.status === FULFILLED) {
    // 如果状态为成功，则调用成功的回调函数onFulfilled，并传入成功的值value
    onFulfilled(this.value);
  } else if (this.status === REJECTED) {
    //如果状态为rejected，则调用失败的回调函数onRejected，并传入失败原因reason
    onRejected(this.reason);
  }
}
```
### 5. 使用`module.exports`导出`MyPromise`
```js
module.exports = MyPromise;
```
测试一下
新建`test.js`文件，引入`Mypromise`
```js
const MyPromise = require('./MyPromise');
const promise = new MyPromise((resolve, reject) => {
  resolve('success');
  reject('error');
})
promise.then(value => {
  console.log('fulfilled', value);
}, reason => {
  console.log('rejected', reason);
})
// 运行结果：fulfilled success
```

## 二. 加入异步逻辑
问题：上述简易版尚未实现异步逻辑，若有异步逻辑，则执行会有问题
例如：
```js
const MyPromise = require('./MyPromise');
const promise = new MyPromise((resolve, reject) => {
  setTimeout(() => {
    resolve('success');
  }, 1000);
  // reject('error');
})

promise.then(value => {
  console.log('fulfilled', value);
}, reason => {
  console.log('rejected', reason);
});
// 运行结果：没有打印信息
```
原因：
主线代码立即执行，`setTimeout`异步执行，`then`方法会立即执行，此时`Promise`状态仍为`pending`，但在`then`方法中并没有对`pending`状态的判断。
解决：
改造上述代码，处理`pending`状态。

### 1. 将成功和失败函数缓存起来
```js
  // 在MyPromise类中新增
  // 用于存储成功的回调
  onFulfilledCallback = null;
  // 用于存储失败的回调
  onRejectedCallback = null;
```
### 2. `then`方法中新增`pending`的判断逻辑。
```js
then = (onFulfilled, onRejected) => {
  // 判断状态
  if (this.status === FULFILLED) {
    // 如果状态为成功，则调用成功的回调函数onFulfilled，并传入成功的值value
    onFulfilled(this.value);
  } else if (this.status === REJECTED) {
    // 如果状态为rejected，则调用失败的回调函数onRejected，并传入失败原因reason
    onRejected(this.reason);
  } else if (this.status === PENDING) {
    // 新增
    // 如果状态为pending，由于不知道后面状态如何变化，先将成功和失败的回调存起来
    this.onFulfilledCallback = onFulfilled;
    this.onRejectedCallback = onRejected;
  }
}
```
### 3. `resolve`和`reject`方法改造
```js
  // resolve和reject使用箭头函数，便于在调用时，方法的this指向当前实例，若是普通函数，则会指向window或undefined
  // 更改成功后的状态
  resolve = (value) => {
    // 只有状态为等待，才执行修改
    if (this.status === PENDING) {
      // 修改状态为成功
      this.status = FULFILLED;
      // 保存成功的值
      this.value = value;
      // 新增
      // 如果存在成功回调函数，则进行调用
      this.onFulfilledCallback && this.onFulfilledCallback(value);
    }
  }
  // 更改失败后的状态
  reject = (reason) => {
    // 只有状态为等待，才执行修改
    if (this.status === PENDING) {
      // 修改状态为rejected
      this.status = REJECTED;
      // 保存失败后的原因
      this.reason = reason;
      // 新增
      // 如果存在失败回调函数，则进行调用
      this.onRejectedCallback && this.onRejectedCallback(reason);
    }
  }
```
再次验证上面的例子：
```js
const MyPromise = require('./MyPromise');
const promise = new MyPromise((resolve, reject) => {
  setTimeout(() => {
    resolve('success');
  }, 1000);
  // reject('error');
})

promise.then(value => {
  console.log('fulfilled', value);
}, reason => {
  console.log('rejected', reason);
});
// 运行结果：等待1s，打印fulfilled success
```
## 三、实现`then`方法多次调用添加多个处理函数
问题：`Promise`的`then`方法可以被多次调用，如果有多个`then`的调用，若是同步回调，则直接返回当前的值；若是异步回调，则保存多个成功和失败的回调函数，因为每个回调函数各不相同，需要用不同的值进行保存，前面的代码仍需改进。
例如：
```js
const MyPromise = require('./MyPromise');
const promise = new MyPromise((resolve, reject) => {
  setTimeout(() => {
    resolve('success');
  }, 1000);
  // reject('error');
})
promise.then(value => {
  console.log(1);
  console.log('fulfilled', value);
}, reason => {
  console.log('rejected', reason);
})
promise.then(value => {
  console.log(2);
  console.log('fulfilled', value);
}, reason => {
  console.log('rejected', reason);
})
promise.then(value => {
  console.log(3);
  console.log('fulfilled', value);
}, reason => {
  console.log('rejected', reason);
})
/**
 * 运行结果：
 * 3
 * fulfilled success
 */
```
### 1. `MyPromise`类中新增两个数组
```js
  // 用于存储成功的回调
  onFulfilledCallbacks = [];
  // 用于存储失败的回调
  onRejectedCallbacks = [];
```
### 2. `then`方法中将回调函数存入数组
```js
  then = (onFulfilled, onRejected) => {
    // 判断状态
    if (this.status === FULFILLED) {
      // 如果状态为成功，则调用成功的回调函数onFulfilled，并传入成功的值value
      onFulfilled(this.value);
    } else if (this.status === REJECTED) {
      // 如果状态为rejected，则调用失败的回调函数onRejected，并传入失败原因reason
      onRejected(this.reason);
    } else if (this.status === PENDING) {
      // 如果状态为pending，由于不知道后面状态如何变化，先将成功和失败的回调存起来
      // 存入数组，等待后续调用
      this.onFulfilledCallbacks.push(onFulfilled);
      this.onRejectedCallbacks.push(onRejected);
    }
  }
```
### 3. `resolve`和`reject`方法改造
```js
  // 更改成功后的状态
  resolve = (value) => {
    // 只有状态为等待，才执行修改
    if (this.status === PENDING) {
      // 修改状态为成功
      this.status = FULFILLED;
      // 保存成功的值
      this.value = value;
      // 如果存在成功回调函数，则将所有成功回调函数进行执行
      while (this.onFulfilledCallbacks.length > 0) {
        this.onFulfilledCallbacks.shift()(value);
      }
    }
  }
  // 更改失败后的状态
  reject = (reason) => {
    // 只有状态为等待，才执行修改
    if (this.status === PENDING) {
      // 修改状态为rejected
      this.status = REJECTED;
      // 保存失败后的原因
      this.reason = reason;
      // 如果存在失败回调函数，则将所有失败回调函数进行执行
      while (this.onRejectedCallbacks.length > 0) {
        this.onRejectedCallbacks.shift()(reason);
      }
    }
  }
```
再次运行上述例子：
```js
1
fulfilled success
2
fulfilled success
3
fulfilled success
```
## 四、实现`then`方法链式调用
分析：
    * `then`方法要实现链式调用，就需要返回一个`Promise`对象
    * `then`方法里返回一个值，作为下一个`then`方法的参数，如果返回一个`Promise`对象，就需要判断它的状态
例如：
```js
const MyPromise = require('./MyPromise');
const promise = new MyPromise((resolve, reject) => {
  resolve('success');
  // reject('error');
})
function other() {
  return new MyPromise((resolve, reject) => {
    resolve('Other promise');
  })
}
promise.then(value => {
  console.log(1);
  console.log('fulfilled', value);
  return other();
}).then(value => {
  console.log(2);
  console.log('fulfilled', value);
})

// 执行报错
```
### 1. 修改`then`方法
```js
class MyPromise {
  // ...
  then = (onFulfilled, onRejected) => {
    const thenPromise = new MyPromise((resolve, reject) => {
      // 判断状态
      if (this.status === FULFILLED) {
        // 如果状态为成功，则调用成功的回调函数onFulfilled，并传入成功的值value
        const x = onFulfilled(this.value);
        resolvePromise(x, resolve, reject)
      } else if (this.status === REJECTED) {
        // 如果状态为rejected，则调用失败的回调函数onRejected，并传入失败原因reason
        onRejected(this.reason);
      } else if (this.status === PENDING) {
        // 如果状态为pending，由于不知道后面状态如何变化，先将成功和失败的回调存起来
        this.onFulfilledCallbacks.push(onFulfilled);
        this.onRejectedCallbacks.push(onRejected);
      }
    })
    return thenPromise;
  }
}

function resolvePromise(x, resolve, reject) {
  if (x instanceof MyPromise) {
    x.then(resolve, reject);
  } else {
    resolve(x);
  }
}
```
## 五、`then`方法链式调用识别`Promise`是否返回自己
问题：
若`then`方法返回的是自己的`Promise`对象，则会发循环调用，程序会报错。
例如：
```js
const oP = new Promise((resolve) => {
  resolve('success');
})
const op1 = oP.then(value => {
  console.log(value);
  return op1;
})
// 运行结果：报错  [TypeError: Chaining cycle detected for promise #<Promise>]
```
### 1. 改进`then`和`resolvePromise`方法
```js
{
  // ...
  then = (onFulfilled, onRejected) => {
    const thenPromise = new MyPromise((resolve, reject) => {
      // 判断状态
      if (this.status === FULFILLED) {
        // 如果状态为成功，则调用成功的回调函数onFulfilled，并传入成功的值value
        const x = onFulfilled(this.value);
        resolvePromise(thenPromise, x, resolve, reject)
      } else if (this.status === REJECTED) {
        // 如果状态为rejected，则调用失败的回调函数onRejected，并传入失败原因reason
        onRejected(this.reason);
      } else if (this.status === PENDING) {
        // 如果状态为pending，由于不知道后面状态如何变化，先将成功和失败的回调存起来
        this.onFulfilledCallbacks.push(onFulfilled);
        this.onRejectedCallbacks.push(onRejected);
      }
    })
    return thenPromise;
  }
}
```
同时参考`Promise A+`[官网文档](https://promisesaplus.com/#point-55)，改进`resolvePromise`方法
```js
function resolvePromise(thenPromise, x, resolve, reject) {
  // 相当则说明，执行then返回的是promise本身，抛出错误并返回
  if (thenPromise === x) {
    return reject(new TypeError('[TypeError: Chaining cycle detected for promise #<Promise>]'))
  }
  if (typeof x === 'object' || typeof x === 'function') {
    if (x === null) {
      return resolve(x);
    }
    let then;
    try {
      // 把x.then赋值给then
      then = x.then;
    } catch (error) {
      // 若取x.then时抛出错误error，则以error为原因拒绝promise
      return reject(error);
    }
    // 如果then是函数
    if (typeof then === 'function') {
      let called = false;
      try {
        then.call(
          // 以x为this，调用then
          x,
          // 若resolvePromise以y值为参数被调用，则执行[[Resolve]](promise, y)
          y => {
            // 如果同时调用了resolvePromise和rejectPromise，或者对同一参数进行了多次调用，则第一次调用优先，任何后续调用都将被忽略。
            if (called) return;
            called = true;
            resolvePromise(thenPromise, y, resolve, reject);
          },
          // 若rejectPromise以原因r被调用，则以r为原因拒绝promise
          r => {
            if (called) return;
            called = true;
            reject(r);
          }
        )
      } catch (error) {
        // 如果调用then方法时抛出异常error
        // 若resolvePromise或rejectPromise已经被调用过，则直接忽略
        if (called) return;
        // 否则以error为原因拒绝promise
        reject(error);
      }
    } else {
      // 若then不是函数，则以x为参数完成promise
      resolve(x);
    }
  } else {
    // 若x既不是对象也不是函数，则以x为参数完成promise
    resolve(x);
  }
}
```
执行例子：
```js
const MyPromise = require('./MyPromise');
const promise = new MyPromise((resolve, reject) => {
  resolve('success');
  // reject('error');
})
const p = promise.then(value => {
  console.log(1);
  console.log('fulfilled', value);
  return p;
}, reason => {
  console.log('rejected', reason);
})
p.then(value => {
  console.log(2);
  console.log('fulfilled', value);
}, reason => {
  console.log(3);
  console.log('rejected', reason);
})
// 执行报错：ReferenceError: Cannot access 'p' before initialization
```
原因分析：
`then`方法中，需要等`thenPromise`初始化完成，才能调用`resolvePromise`，所以需要用一个微任务来执行这一部分逻辑。
### 2. 再次改进`then`方法
```js
  then = (onFulfilled, onRejected) => {
    const thenPromise = new MyPromise((resolve, reject) => {
      // 判断状态
      if (this.status === FULFILLED) {
        // 如果状态为成功，则调用成功的回调函数onFulfilled，并传入成功的值value
        queueMicrotask(() => {
          const x = onFulfilled(this.value);
          resolvePromise(thenPromise, x, resolve, reject)
        })
      } else if (this.status === REJECTED) {
        // 如果状态为rejected，则调用失败的回调函数onRejected，并传入失败原因reason
        onRejected(this.reason);
      } else if (this.status === PENDING) {
        // 如果状态为pending，由于不知道后面状态如何变化，先将成功和失败的回调存起来
        this.onFulfilledCallbacks.push(onFulfilled);
        this.onRejectedCallbacks.push(onRejected);
      }
    })
    return thenPromise;
  }
```
再次运行例子
```js
1
fulfilled success
3
rejected TypeError: [TypeError: Chaining cycle detected for promise #<Promise>]
```
## 六、错误捕获及`then`链式调用其他状态码补充
### 1. 捕获执行器错误
> 捕获执行器中的代码，如果执行器中的代码有错误，那么`Promise`的状态要变为`rejected`
```js
class MyPromise {
  // 构造方法中接收一个执行器
  constructor(executor) {
    // 执行器会立即执行，并传入resolve和reject方法
    try {
      executor(this.resolve, this.reject);
    } catch (error) {
      this.reject(error);
    }
  }
}
```
测试一下：
```js
const MyPromise = require('./MyPromise');
const promise = new MyPromise((resolve, reject) => {
  // resolve('success');
  // reject('error');
  throw new Error('执行器出错了')
})
const p = promise.then(value => {
  console.log(1);
  console.log('fulfilled', value);
  return p;
}, reason => {
  console.log('rejected', reason);
})
// 运行结果：rejected Error: 执行器出错了
```
### 2. 捕获`then`执行时的错误
```js
  then = (onFulfilled, onRejected) => {
    const thenPromise = new MyPromise((resolve, reject) => {
      // 判断状态
      if (this.status === FULFILLED) {
        // 如果状态为成功，则调用成功的回调函数onFulfilled，并传入成功的值value
        queueMicrotask(() => {
          try {
            const x = onFulfilled(this.value);
            resolvePromise(thenPromise, x, resolve, reject);
          } catch (error) {
            reject(error);
          }
        })
      } else if (this.status === REJECTED) {
        // 如果状态为rejected，则调用失败的回调函数onRejected，并传入失败原因reason
        onRejected(this.reason);
      } else if (this.status === PENDING) {
        // 如果状态为pending，由于不知道后面状态如何变化，先将成功和失败的回调存起来
        this.onFulfilledCallbacks.push(onFulfilled);
        this.onRejectedCallbacks.push(onRejected);
      }
    })
    return thenPromise;
  }
```
测试以下例子：
```js
const MyPromise = require('./MyPromise');
const promise = new MyPromise((resolve, reject) => {
  resolve('success');
  // reject('error');
})
const p = promise.then(value => {
  console.log(1);
  console.log('fulfilled', value);
  throw new Error('then 执行出错了')
}, reason => {
  console.log('rejected', reason);
}).then(value => {
  console.log(2);
  console.log('fulfilled', value);
}, reason => {
  console.log('rejected', reason);
})
```
运行结果：
```js
1
fulfilled success
rejected Error: then 执行出错了
```
## 七、参考`fulfilled`下的状态处理，改造`rejected`和`pending`下的状态处理
> 改造点：
> 1. 增加异步状态下链式调用
> 2. 增加回调函数执行结果判断
> 3. 增加识别`Promise`是否返回自己
> 4. 增加错误捕获
```js
  then = (onFulfilled, onRejected) => {
    const thenPromise = new MyPromise((resolve, reject) => {
      // 判断状态
      if (this.status === FULFILLED) {
        // 如果状态为成功，则调用成功的回调函数onFulfilled，并传入成功的值value
        queueMicrotask(() => {
          try {
            const x = onFulfilled(this.value);
            resolvePromise(thenPromise, x, resolve, reject);
          } catch (error) {
            reject(error);
          }
        })
      } else if (this.status === REJECTED) {
        // 如果状态为rejected，则调用失败的回调函数onRejected，并传入失败原因reason
        queueMicrotask(() => {
          try {
            const reason = onRejected(this.reason);
            resolvePromise(thenPromise, reason, resolve, reject);
          } catch (error) {
            reject(error);
          }
        })
      } else if (this.status === PENDING) {
        // 如果状态为pending，由于不知道后面状态如何变化，先将成功和失败的回调存起来
        this.onFulfilledCallbacks.push(() => {
          queueMicrotask(() => {
            try {
              const x = onFulfilled(this.value);
              resolvePromise(thenPromise, x, resolve, reject);
            } catch (error) {
              reject(error);
            }
          })
        });
        this.onRejectedCallbacks.push(() => {
          queueMicrotask(() => {
            try {
              const reason = onRejected(this.reason);
              resolvePromise(thenPromise, reason, resolve, reject);
            } catch (error) {
              reject(error);
            }
          })
        });
      }
    })
    return thenPromise;
  }
```
## 八、`then`中的参数变为可选
原生的`Promise`中，`then`方法的`onResolve`和`onReject`可以单传，或者不传，都不影响执行，而且传入的`onResolve`和`onReject`若不是函数，则会被忽略。
```js
  then = (onFulfilled, onRejected) => {
    // 若传入的不是函数，则使用默认值
    onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : value => value;
    onRejected = typeof onRejected === 'function' ? onRejected : reason => { throw reason };
    const thenPromise = new MyPromise((resolve, reject) => {
      // 判断状态
      // ...
  }
```
测试：
resolve之后：
```js
const MyPromise = require('./MyPromise');
const promise = new MyPromise((resolve, reject) => {
  resolve('success');
  // reject('error');
})
promise.then().then().then(value => console.log(value))
// 执行结果：success
```
reject之后：
```js
const MyPromise = require('./MyPromise');
const promise = new MyPromise((resolve, reject) => {
  // resolve('success');
  reject('error');
})
promise.then().then().then(1, value => console.log(value))
// 执行结果：error
```
## 九、实现`resolve`和`reject`的静态调用
分析：原生`Promise`可以通过`Promise.resolve()`直接创建一个成功的`Promise`，而上述的`MyPromise`对象中没有此方法可以调用
测试：
```js
const MyPromise = require('./MyPromise');
MyPromise.resolve('aaa').then(value => {
  console.log('[Log] 1-->', value);
  return MyPromise.resolve('bbb');
}).then(value => {
  console.log('[Log] 2-->', value);
})
// 运行报错：TypeError: MyPromise.resolve is not a function
```
再次运行上面测试代码：
```js
[Log] 1--> aaa
[Log] 2--> bbb
```
## 十、`Promise A+`测试
### 1. 安装
```js
npm install promises-aplus-tests -D
```
### 2. 代码中加入deferred
```js
MyPromise.deferred = function () {
  var result = {};
  result.promise = new MyPromise(function (resolve, reject) {
    result.resolve = resolve;
    result.reject = reject;
  });
  return result;
}
```
### 3. 配置启动命令
```json
{
  "name": "promise",
  "version": "1.0.0",
  "description": "my promise",
  "main": "MyPromise.js",
  "scripts": {
    "test": "promises-aplus-tests MyPromise"
  },
  "author": "ITEM",
  "license": "ISC",
  "devDependencies": {
    "promises-aplus-tests": "^2.1.2"
  }
}
```
运行测试
```js
npm run test
```
## 十一、添加all、race、catch方法
### 1. all
> 1. `Promise.all()`静态方法接受一个`Promise`可迭代对象作为输入，并返回一个`Promise`。
> 2. 当所有输入的`Promise`都被兑现时，返回的`Promise`也将被兑现，兑现值是一个数组，其元素顺序与传入的 promise 一致。
> 3. 如果输入的任何`Promise`被拒绝，则返回的`Promise`将被拒绝，并带有第一个被拒绝的原因。
> 4. 如果传递给`Promise.all`的参数中包含非`Promise`值，它们会被当作已解决的`Promise`处理。
```js
  static all(promises) {
    // 返回一个Promise
    return new MyPromise((resolve, reject) => {
      try {
        let res = Array.from({ length: promises.length });
        // 用于记录已完成的Promise数
        let resolveCount = 0;
        for (let i = 0; i < promises.length; i++) {
          // 用resolve包一层，兼容promises[i]不是Promise对象的情况
          // 确保每个promises[i]都是已完成或已拒绝，所以在then方法中收集结果
          MyPromise.resolve(promises[i]).then(value => {
            resolveCount++;
            res[i] = value;
            // 当已完成的Promise数等于promises项数时，表示全部Promise已完成，调用resolve并传入兑现值数组res
            if (resolveCount === promises.length) {
              resolve(res);
            }
          }, reason => {
            // 当其中一个为已拒绝时，直接调用reject并传入当前拒绝原因
            reject(reason);
          });
        }
      } catch (error) {
        // 若执行出错，则以错误为原因直接reject
        reject(error);
      }
    })
  }
```
### 2. race
> `Promise.race()`静态方法接受一个`promise`可迭代对象作为输入，并返回一个`Promise`。这个返回的`promise`会随着第一个`promise`的敲定而敲定（即最快的`Promise`成功`Promise.race`就成功，最快的`Promise`失败`Promise.race`就失败）。
```js
  static race(promises) {
    return new MyPromise((resolve, reject) => {
      try {
        for (let i = 0; i < promises.length; i++) {
          // 用resolve包一层，兼容promises[i]不是Promise对象的情况
          // 确保promises[i]是已完成或已拒绝，所以在then方法中进行状态处理
          MyPromise.resolve(promises[i]).then(value => {
            // 当前promise完成，则调用resolve，并传入当前兑现值
            resolve(value);
          }, reason => {
            // 当前promise被拒绝时，直接调用reject并传入当前拒绝原因
            reject(reason);
          })
        }
      } catch (error) {
        // 若执行出错，则以错误为原因直接reject
        reject(error);
      }
    })
  }
```
### 3. catch
> `catch`方法其实是`then`方法的语法糖
```js
class MyPromise {
  // ...
  catch = onRejected => {
    return this.then(null, onRejected);
  }
  // ...
}
```