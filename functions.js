const RAW_TO_XRB = '1000000000000000000000000000000';

function rawToXrb(value) {
  return Big(value).div(RAW_TO_XRB);
}

function xrbToRaw(value) {
  return Big(value).times(RAW_TO_XRB);
}

/*
  Calculate key/address pair for a specific account in wallet
  @param  accountIndex Number 32-bit unsigned integer
  @return Object
 */
function accountPair(seed, accountIndex) {
  var context = blake2bInit(32);
  blake2bUpdate(context, hex_uint8(seed));
  blake2bUpdate(context, hex_uint8(dec2hex(accountIndex, 4)));

  var newKey = blake2bFinal(context);
  return {
    key: uint8_hex(newKey),
    address: accountFromHexKey(uint8_hex(nacl.sign.keyPair.fromSecretKey(newKey).publicKey))
  };
}

function buildTemplate(htmlTemplate, events, options) {
  const el = document.createElement('div');
  options = Object.assign({
    focusForm: false,
  }, options || {});

  el.innerHTML = htmlTemplate;

  Object.keys(events).forEach(eventKey => {
    const keySplit = eventKey.split(' ');
    if(keySplit.length < 2)
      throw new Error('Event key must include selector and event type');

    const selector = keySplit.slice(0, keySplit.length - 1).join(' ');
    const eventName = keySplit.slice(keySplit.length - 1)[0];
    el.querySelectorAll(selector).forEach(bindEl => {
      // Custom event type for instant keypress updates
      if(eventName === 'inputChange') {
        const bindElHandler = e => {
          events[eventKey](e, el, bindEl);
        }
        bindEl.addEventListener('change', bindElHandler);
        bindEl.addEventListener('keypress', bindElHandler);
        bindEl.addEventListener('keyup', bindElHandler);
        events[eventKey]({ target: bindEl }, el, bindEl);
      } else {
        bindEl.addEventListener(eventName, e => {
          e.preventDefault();
          events[eventKey](e, el, bindEl);
        }, false);
      }
    });
  });

  if(options.focusForm)
    setTimeout(() => { el.querySelector('form').elements[0].focus(); }, 100);

  return el;
}

function formValues(form) {
  return Array.prototype.reduce.call(form.elements, function(out, el) {
    if(el.name) out[el.name] = el.value;
    return out;
  }, {});
}

function zeroPad(num, size) {
  // Max 32 digits
  var s = "00000000000000000000000000000000" + num;
  return s.substr(s.length-size);
};

// From http://2ality.com/2015/01/template-strings-html.html
function html(literalSections, ...substs) {
	let raw = literalSections.raw;
	let result = '';

	substs.forEach((subst, i) => {
			let lit = raw[i];
			if (Array.isArray(subst)) {
					subst = subst.join('');
			}
			if (lit.endsWith('$')) {
					subst = htmlEscape(subst);
					lit = lit.slice(0, -1);
			}
			result += lit;
			result += subst;
	});
	result += raw[raw.length-1];
	return result;
}

function htmlEscape(str) {
  if(typeof str === 'number') return '' + str;
	return str.replace(/&/g, '&amp;') // first!
						.replace(/>/g, '&gt;')
						.replace(/</g, '&lt;')
						.replace(/"/g, '&quot;')
						.replace(/'/g, '&#39;')
						.replace(/`/g, '&#96;');
}

function b64_uint8(b64) {
  return new Uint8Array(atob(b64).split("").map(function(c) {
    return c.charCodeAt(0); }))
}

function uint8_b64(arr) {
  return btoa(String.fromCharCode.apply(null, arr));
}

function concat_uint8(arrays) {
	let totalLength = 0;
	for (let arr of arrays) {
		totalLength += arr.byteLength;
	}
	let result = new Uint8Array(totalLength);
	let offset = 0;
	for (let arr of arrays) {
		result.set(arr, offset);
		offset += arr.length;
	}
	return result;
}

// general functions

function stringFromHex(hex) {
	var hex = hex.toString();//force conversion
	var str = '';
	for (var i = 0; i < hex.length; i += 2)
		str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
	return str;
}

function stringToHex(str) {
	var hex = '';
	for(var i=0;i<str.length;i++) {
		hex += ''+str.charCodeAt(i).toString(16);
	}
	return hex;
}

function accountFromHexKey (hex)
{
	var checksum = '';
	var key_bytes = uint4_uint8( hex_uint4 (hex) );
	var checksum = uint5_string( uint4_uint5( uint8_uint4( blake2b(key_bytes, null, 5).reverse() ) ) );
	var c_account = uint5_string( uint4_uint5( hex_uint4 ('0'+hex) ) );
	return 'xrb_'+ c_account + checksum;
	
}

function parseXRBAccount(str)
{
	var i = str.indexOf('xrb_');
	if(i !== -1)
	{
		var acc = str.slice(i, i + 64);
		try{
			keyFromAccount(acc);
			return acc;
		}catch (e){
			return false;
		}
	}
	return false;
}


function dec2hex(str, bytes = null)
{
	var dec = str.toString().split(''), sum = [], hex = [], i, s
	while(dec.length)
	{
		s = 1 * dec.shift()
		for(i = 0; s || i < sum.length; i++)
		{
			s += (sum[i] || 0) * 10
			sum[i] = s % 16
			s = (s - sum[i]) / 16
		}
	}
	while(sum.length)
	{
		hex.push(sum.pop().toString(16));
	}
	
	hex = hex.join('');
	
	if(hex.length % 2 !== 0)
		hex = "0" + hex;
		
	if(bytes > hex.length / 2)
	{
		var diff = bytes - hex.length / 2;
		for(var i = 0; i < diff; i++)
			hex = "00" + hex;
	}
	
	return hex;
}

function hex2dec(s) {

	function add(x, y) {
		var c = 0, r = [];
		var x = x.split('').map(Number);
		var y = y.split('').map(Number);
		while(x.length || y.length) {
			var s = (x.pop() || 0) + (y.pop() || 0) + c;
			r.unshift(s < 10 ? s : s - 10); 
			c = s < 10 ? 0 : 1;
		}
		if(c) r.unshift(c);
		return r.join('');
	}

	var dec = '0';
	s.split('').forEach(function(chr) {
		var n = parseInt(chr, 16);
		for(var t = 8; t; t >>= 1) {
			dec = add(dec, dec);
			if(n & t) dec = add(dec, '1');
		}
	});
	return dec;
}


/*
BSD 3-Clause License

Copyright (c) 2017, SergiySW
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice, this
  list of conditions and the following disclaimer.

* Redistributions in binary form must reproduce the above copyright notice,
  this list of conditions and the following disclaimer in the documentation
  and/or other materials provided with the distribution.

* Neither the name of the copyright holder nor the names of its
  contributors may be used to endorse or promote products derived from
  this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

*/

// Arrays manipulations
function uint8_uint4 (uint8) {
	var length = uint8.length;
	var uint4 = new Uint8Array(length*2);
	for (let i = 0; i < length; i++) {
		uint4[i*2] = uint8[i] / 16 | 0;
		uint4[i*2+1] = uint8[i] % 16;
	}
	return uint4;
}

function uint4_uint8 (uint4) {
	var length = uint4.length / 2;
	var uint8 = new Uint8Array(length);
	for (let i = 0; i < length; i++)	uint8[i] = uint4[i*2] * 16 + uint4[i*2+1];
	return uint8;
}

function uint4_uint5 (uint4) {
	var length = uint4.length / 5 * 4;
	var uint5 = new Uint8Array(length);
	for (let i = 1; i <= length; i++) {
		let n = i - 1;
		let m = i % 4;
		let z = n + ((i - m)/4);
		let right = uint4[z] << m;
		let left;
		if (((length - i) % 4) === 0)	left = uint4[z-1] << 4;
		else	left = uint4[z+1] >> (4 - m);
		uint5[n] = (left + right) % 32;
	}
	return uint5;
}

function uint5_uint4 (uint5) {
	var length = uint5.length / 4 * 5;
	var uint4 = new Uint8Array(length);
	for (let i = 1; i <= length; i++) {
		let n = i - 1;
		let m = i % 5;
		let z = n - ((i - m)/5);
		let right = uint5[z-1] << (5 - m);
		let left = uint5[z] >> m;
		uint4[n] = (left + right) % 16;
	}
	return uint4;
}

function string_uint5 (string) {
	var letter_list = letter_list = '13456789abcdefghijkmnopqrstuwxyz'.split('');
	var length = string.length;
	var string_array = string.split('');
	var uint5 = new Uint8Array(length);
	for (let i = 0; i < length; i++)	uint5[i] = letter_list.indexOf(string_array[i]);
	return uint5;
}

function uint5_string (uint5) {
	var letter_list = letter_list = '13456789abcdefghijkmnopqrstuwxyz'.split('');
	var string = "";
	for (let i = 0; i < uint5.length; i++)	string += letter_list[uint5[i]];
	return string;
}

function hex_uint8 (hex) {
	var length = (hex.length / 2) | 0;
	var uint8 = new Uint8Array(length);
	for (let i = 0; i < length; i++) uint8[i] = parseInt(hex.substr(i * 2, 2), 16);
	return uint8;
}


function hex_uint4 (hex)
{
	var length = hex.length;
	var uint4 = new Uint8Array(length);
	for (let i = 0; i < length; i++) uint4[i] = parseInt(hex.substr(i, 1), 16);
	return uint4;
}


function uint8_hex (uint8) {
	var hex = "";
	for (let i = 0; i < uint8.length; i++)
	{
		aux = uint8[i].toString(16).toUpperCase();
		if(aux.length === 1)
			aux = '0'+aux;
		hex += aux;
		aux = '';
	}
	return(hex);
}

function uint4_hex (uint4)
{
	var hex = "";
	for (let i = 0; i < uint4.length; i++) hex += uint4[i].toString(16).toUpperCase();
	return(hex);   
}

function equal_arrays (array1, array2) {
	for (let i = 0; i < array1.length; i++) {
		if (array1[i] !== array2[i])	return false;
	}
	return true;
}


function array_crop (array) {
	var length = array.length - 1;
	var cropped_array = new Uint8Array(length);
	for (let i = 0; i < length; i++)
		cropped_array[i] = array[i+1];
	return cropped_array;
}

function keyFromAccount(account)
{
	if ((account.startsWith('xrb_1') || account.startsWith('xrb_3')) && (account.length === 64)) {
		var account_crop = account.substring(4,64);
		var isValid = /^[13456789abcdefghijkmnopqrstuwxyz]+$/.test(account_crop);
		if (isValid) {
			var key_uint4 = array_crop(uint5_uint4(string_uint5(account_crop.substring(0,52))));
			var hash_uint4 = uint5_uint4(string_uint5(account_crop.substring(52,60)));
			var key_array = uint4_uint8(key_uint4);
			var blake_hash = blake2b(key_array, null, 5).reverse();
			if (equal_arrays(hash_uint4, uint8_uint4(blake_hash))) {
				var key = uint4_hex(key_uint4);
				return key;
			}
			else
				throw "Checksum incorrect.";
		}
		else
			throw "Invalid XRB account.";
	}
	throw "Invalid XRB account.";
}