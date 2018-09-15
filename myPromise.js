const STATUS = {
  PENDING : 'pending',
  RESOLVED: 'resolved',
  REJECTED: 'rejected'
};

/**
 * Promise方法
 * @param executor
 * @constructor
 */
function Promise(executor) {
  let self    = this;
  self.status = STATUS.PENDING;
  self.value  = undefined;
  self.reason = undefined;
  // 存then成功和失败的回调
  self.onResolvedCallbacks = [];
  self.onRejectedCallbacks = [];

  function resolve(value) {
    if (self.status === STATUS.PENDING) {
      self.status = STATUS.RESOLVED;
      self.value  = value;
      self.onResolvedCallbacks.forEach(function (resolvedCallback) {
        resolvedCallback();
      })
    }
  }

  function reject(reason) {
    if (self.status === STATUS.PENDING) {
      self.status = STATUS.REJECTED;
      self.reason = reason;
      self.onRejectedCallbacks.forEach(function (rejectedCallback) {
        rejectedCallback();
      })
    }
  }

  try {
    executor(resolve, reject);
  } catch (e) {
    reject(e);
  }
}

/**
 * then方法
 * @param onFulfiled 成功状态的回调函数
 * @param onRejected 失败状态的回调函数
 * @returns {*}
 */
Promise.prototype.then = function (onFulfiled, onRejected) {
  // 成功失败回调不传时给一个默认函数
  onFulfiled = typeof onFulfiled === 'function' ? onFulfiled : function (value) {
    return value;
  };
  onRejected = typeof onRejected === 'function' ? onRejected : function (e) {
    throw e;
  };

  let self = this;

  let promise2;

  if (self.status === STATUS.RESOLVED) {
    // then的链式调用，返回新的promise
    promise2 = new Promise(function (resolve, reject) {
      setTimeout(function () {
        try {
          let x = onFulfiled(self.value);
          dealReturnResult(promise2, x, resolve, reject);
        } catch (e) {
          reject(e);
        }
      })
    })
  }

  if (self.status === STATUS.REJECTED) {
    promise2 = new Promise(function (resolve, reject) {
      setTimeout(function () {
        try {
          let x = onRejected(self.reason);
          dealReturnResult(promise2, x, resolve, reject)
        } catch (e) {
          reject(e);
        }
      })
    })
  }

  // 可能执行器代码是异步，调用then时状态还没变成功或失败
  if (self.status === STATUS.PENDING) {

    promise2 = new Promise(function (resolve, reject) {
      self.onResolvedCallbacks.push(function () {
        // setTimeout设置resolve回调异步执行
        setTimeout(function () {
          try {
            let x = onFulfiled(self.value);
            dealReturnResult(promise2, x, resolve, reject)
          } catch (e) {
            reject(e);
          }
        })
      });
      self.onRejectedCallbacks.push(function () {
        setTimeout(function () {
          try {
            let x = onRejected(self.reason);
            dealReturnResult(promise2, x, resolve, reject)
          } catch (e) {
            reject(e);
          }
        })
      });
    })

  }
  return promise2;
};

/**
 * 根据回调函数的返回值是普通值或promise值分别处理
 * @param promise2 新的promise
 * @param x 返回的值
 * @param resolve resolve回调函数
 * @param reject reject回调函数
 * @returns {*}
 */
function dealReturnResult(promise2, x, resolve, reject) {
  if (promise2 === x) {
    return reject(new TypeError('循环引用'));
  }

  // 是否调用过成功或失败的标志，防止多次调用resolve/reject
  let callSuccess;
  // 返回值是promise类型
  if (x !== null && (typeof x === 'object' || typeof x === 'function')) {
    try {
      let then = x.then;
      if (typeof then === 'function') {
        then.call(x, function (y) {
          if (callSuccess) return;
          callSuccess = true;
          dealReturnResult(promise2, y, resolve, reject);
        }, function (e) {
          if (callSuccess) return;
          callSuccess = true;
          reject(e);
        })
      } else {
        // then不是方法
        resolve(x);
      }
    } catch (e) {
      if (callSuccess) return;
      callSuccess = true;
      reject(e);
    }
  } else {
    return resolve(x);
  }
}

/**
 * 测试用暴露的deferred方法
 * 运行promises-aplus-tests myPromise.js
 *
 * @type {function()}
 */
Promise.deferred = Promise.defer = function () {
  let defer = {};
  defer.promise = new Promise(function (resolve, reject) {
    defer.resolve = resolve;
    defer.reject  = reject;
  });
  return defer;
};

module.exports = Promise;