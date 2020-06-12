// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava'
import getAtPath from './getAtPath'

const arraySame = (arr1: any[], arr2: any[]): boolean => {
  if (!arr1.every(i => arr2.includes(i))) return false
  if (!arr2.every(i => arr1.includes(i))) return false
  return true
}

test('getAtPath - single value', (t) => {
  t.is(getAtPath({
    _id: 'sadf',
    categories: [{
      _id: 'abc',
    }, {
      _id: 'def',
    }],
  }, '_id'), 'sadf')
})

test('getAtPath - object value', (t) => {
  t.is(getAtPath({
    _id: 'sadf',
    nested: {
      object: {
        value: 1,
      },
    },
    categories: [{
      _id: 'abc',
    }, {
      _id: 'def',
    }],
  }, 'nested.object.value'), 1)
})

test('getAtPath - simple array', (t) => {
  t.true(arraySame(getAtPath({
    categories: [{
      _id: 'abc',
    }, {
      _id: 'def',
    }],
  }, 'categories._id'), [
    'abc',
    'def',
  ]))
})

test('getAtPath - sub array', (t) => {
  t.true(arraySame(getAtPath({
    categories: [{
      _id: 'abc',
      sub: [{
        _id: 'asdf',
      }, {
        _id: 'lkjh',
      }],
    }, {
      _id: 'def',
      sub: [{
        _id: '1234',
      }, {
        _id: '5678',
      }],
    }],
  }, 'categories.sub._id'), [
    'asdf',
    'lkjh',
    '1234',
    '5678',
  ]))
})

test('getAtPath - object in sub array', (t) => {
  t.true(arraySame(getAtPath({
    categories: [{
      _id: 'abc',
      sub: [{
        _id: 'asdf',
        field: {
          option: true,
        },
      }, {
        _id: 'lkjh',
        field: {
          option: true,
        },
      }],
    }, {
      _id: 'def',
      sub: [{
        _id: '1234',
        field: {
          option: true,
        },
      }, {
        _id: '5678',
        field: {
          option: true,
        },
      }],
    }],
  }, 'categories.sub.field.option'), [
    true,
    true,
    true,
    true,
  ]))
})
