// 定义三个全局变量
const PENDING = 'pending';
const FULFILLED = 'fulfilled';
const REJECTED = 'rejected';

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
  // 存储状态的变量
  status = PENDING;
  // 存储成功后的值
  value = null;
  // 存储失败后的原因
  reason = null;
  // 用于存储成功的回调
  onFulfilledCallbacks = [];
  // 用于存储失败的回调
  onRejectedCallbacks = [];
  // resolve和reject使用箭头函数，便于在调用时，方法的this指向当前实例，若是普通函数，则会指向window或undefined
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
  then = (onFulfilled, onRejected) => {
    onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : value => value;
    onRejected = typeof onRejected === 'function' ? onRejected : reason => { throw reason };
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
  catch = onRejected => {
    return this.then(null, onRejected);
  }
  static resolve(params) {
    // 若传入Promise，则直接返回
    if (params instanceof MyPromise) {
      return params;
    }
    return new MyPromise((resolve) => {
      resolve(params);
    })
  }
  static reject(reason) {
    return new MyPromise((resolve, reject) => {
      reject(reason);
    })
  }
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
}

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
MyPromise.deferred = function () {
  var result = {};
  result.promise = new MyPromise(function (resolve, reject) {
    result.resolve = resolve;
    result.reject = reject;
  });

  return result;
}

module.exports = MyPromise;