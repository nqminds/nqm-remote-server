# obj-util
> A simple helper to set/get keys from objects using a string path like 'some.key.here'

## Install

```bash
npm i --save obj-util
```

## Usage

### obj.getKeyValue 

Returns the value from the given object which matches the passed key
- **param** obj {Object} The object to get the values from
- **param** key {String} a string representing a key in the object. Subkeys are supported separating them with dots. i.e. `key1.subkey1.subsubkey1`
- **returns** {Mixed} the value of the given key in the passed obj

```javascript
var objUtil = require('obj-util');

var obj = {
  some: {
    key: 'some value'
  }
};

// getKeyValue
objUtil.getKeyValue(obj, 'some.key'); // 'some value'
```

### obj.setKeyValue

Sets a value in an object if a matching key is found inside the given object

- **param** obj {Object} the object where to set the value using if the key is found
- **param** key {String} a string that represents the key. Subkeys are supported by separating them with dots.
- **param** val the value to be set in the object

```javascript
var objUtil = require('obj-util');

var obj = {
};
objUtil.setKeyValue(obj, 'some.key', 'some value');
obj.some.key === 'some value' //==> true
```

That's it!