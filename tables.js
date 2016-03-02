"use strict";

function rollArray(length) {
	return Math.floor(Math.random() * length);
}

function rollDice(num, size) {
	var result = 0;
	for (var i=0; i<num; i++)
		result += Math.floor(Math.random() * size) + 1;
	return result;
}

function selectField(array) {
	var numValues = 0;
	for (var i=0; i<array.length; i++) {
		var option = array[i];
		numValues += option.value === undefined ? 1 : parseInt(option.value);
	}
	
	var selectedValue = rollArray(numValues), item;
	
	numValues = 0;
	for (var i=0; i<array.length; i++) {
		var option = array[i];
		numValues += option.value === undefined ? 1 : parseInt(option.value);
		
		if (numValues < selectedValue)
			continue;
		
		item = array[i];
		break;
	}
	
	if (item.Properties !== undefined) {
		var instance = selectTable(item);
		return formatInstance(item, instance);
	}
	
	return item.Text;
}

function selectTable(table) {
	var instance = {}, properties = table.Properties;
	
	for (var field in properties) {
		instance[field] = selectField(properties[field]);
	}
	
	return instance;
}

function formatInstance(table, instance) {
	var output = '';
	
	if (table.Text === undefined)
		for (var field in instance) {
			output += field + ': ' + instance[field] + '\n';
		}
	else {
		output = table.Text;
		for (var field in instance) {
			output = output.replace('{' + field + '}', instance[field]);
		}
		
		output = applyCalculations(output);
	}
	
	return output;
}

function applyCalculations(text) {
	while (true) {
		var start = text.indexOf('[[');
		
		if (start == -1)
			break;
		
		var end = text.indexOf(']]', start);
		
		var calculation = text.substring(start + 2, end);
		var result = performCalculation(calculation);
		
		var before = text.substr(0, start), after = text.substr(end + 2);
		text = before + result + after;
	}
	return text;
}

function performCalculation(calc) {
	while (true) {
		var roll = calc.match(/(\d*)d(\d+)/i);
		if (roll == null)
			break;
		
		var num = roll[1], size = parseInt(roll[2]);
		if (num == '')
			num = 1;
		else
			num = parseInt(num);

		var result = rollDice(num, size);
		calc = calc.replace(roll[0], result);
	}
	
	return eval(calc);
}

function addLinks(tables, parent) {
	for (var i=0; i<tables.length; i++) { // array
		var table = tables[i]; // object
		
		if (parent !== undefined)
			table.Parent = parent;
		
		if (table.Properties === undefined)
			continue;
		
		for (var propName in table.Properties) { // object
			var property = table.Properties[propName];
			property.Parent = table;
			addLinks(property, table);
		}
	}
}

function listTables() {
	var output = '';
	for (var i=0; i<tables.length; i++) {
		var table = tables[i];
		output += '<li>' + table.Name + '</li>';
	}
	document.getElementById('list').innerHTML = output;
}

var tables;
function loadData() {
	$.getJSON('tables.json', '', function( data ) {
		addLinks(data);
		tables = data;
		listTables();
	});
}

function saveData() {
	var json = JSON.stringify(tables, function (key,value) {
		if (key == 'Parent')
			return undefined;
		return value;
	});
	
	window.open('data:text/json,' + encodeURIComponent(json));
}

$(function () {
	loadData();
	$('#list').on('click', 'li', function () {
		var table = tables[$(this).index()];
		var result = selectTable(table);
		$('#output').text(formatInstance(table, result));
	});
});