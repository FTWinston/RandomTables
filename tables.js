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
		numValues += option.Value === undefined ? 1 : parseInt(option.Value);
	}
	
	var selectedValue = rollArray(numValues), item;
	
	numValues = 0;
	for (var i=0; i<array.length; i++) {
		var option = array[i];
		numValues += option.Value === undefined ? 1 : parseInt(option.Value);
		
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
		output += '<div class="table">' + table.Name + '<div class="roll link">⚄</div><div class="edit link">⚙</div></div>';
	}
	document.getElementById('tableList').innerHTML = output;
}

var tables, editTable, editProp;
function loadData() {
	$.getJSON('tables.json', '', function (data) {
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

function showTableEdit(table) {
	editTable = table;
	if (table.Name === undefined)
		$('#tableEdit_name').hide();
	else
		$('#tableEdit_name').show().val(table.Name);
	$('#tableEdit_text').val(table.Text);
	
	var propOutput = '';
	for (var prop in table.Properties) {
		propOutput += '<li class="prop" data-prop="' + prop + '">' + prop + '<div class="edit link">⚙</div><div class="delete link">☠</div></li>';
	}
	$('#tableEdit_properties').html(propOutput);
	
	$('#propertyEdit').hide();
	$('#tableEdit').show();
}

function showPropertyEdit(table, propName) {
	editTable = table;
	editProp = propName;
	var property = table.Properties[propName];
	
	$('#propertyEdit_name').text('Editing the "' + propName + '" property of the "' + table.Name + '" table');
	
	var optOutput = '';
	for (var i=0; i<property.length; i++) {
		var opt = property[i];
		optOutput += '<li class="option">' + opt.Text + ' (chance: ' + opt.Value + ')<div class="edit link">⚙</div><div class="delete link">☠</div></li>';
	}
	$('#propertyEdit_options').html(optOutput);
	
	$('#tableEdit').hide();
	$('#propertyEdit').show();
}

$(function () {
	loadData();
	$('#tableList').on('click', '.roll.link', function () {
		var num = $(this).closest('.table').index();
		var table = tables[num];
		var result = selectTable(table);
		$('#output').text(formatInstance(table, result));
	}).on('click', '.edit.link', function () {
		var num = $(this).closest('.table').index();
		showTableEdit(tables[num]);
	});
	
	$('#tableEdit_properties').on('click', '.edit.link', function () {
		var propName = $(this).closest('.prop').attr('data-prop');
		showPropertyEdit(editTable, propName);
	}).on('click', '.delete.link', function () {
		var propName = $(this).closest('.prop').attr('data-prop');
		delete editTable.Properties[propName];
		showTableEdit(editTable);
	});
	
	$('#propertyEdit_options').on('click', '.edit.link', function () {
		var optNum = $(this).closest('.option').index();
		var opt = editTable.Properties[editProp][optNum];
		console.log(editTable);
		console.log(optNum);
		console.log(opt);
		showTableEdit(opt);
	}).on('click', '.delete.link', function () {
		var optNum = $(this).closest('.option').index();
		editTable.Properties[editProp].splice(optNum, 1);
		showPropertyEdit(editTable, editName);
	});
});