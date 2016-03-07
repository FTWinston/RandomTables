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
		output += '<div class="table">' + table.Name + '<div class="roll link">⚄</div><div class="edit link">✎</div></div>';
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
	$('#displayRoot').hide();
	editTable = table;
	if (table.Name === undefined)
		$('#tableEdit_name').hide();
	else
		$('#tableEdit_name').show().val(table.Name);
	$('#tableEdit_text').val(table.Text);
	
	var propOutput = '';
	for (var prop in table.Properties) {
		propOutput += writePropertyForTableEdit(prop);
	}
	$('#tableEdit_properties').html(propOutput);
	
	$('#propertyEdit').hide();
	$('#tableEdit').show();
}

function writePropertyForTableEdit(prop) {
	var empty = prop.trim() == '' ? ' empty' : '';
	return '<li class="prop' + empty + '" data-prop="' + prop + '"><input type="text" value="' + prop + '" placeholder="property name" /><div class="edit link">✎</div><div class="delete link">☠</div></li>';
}

function showPropertyEdit(table, propName) {
	$('#displayRoot').hide();
	editTable = table;
	editProp = propName;
	var property = table.Properties[propName];
	
	$('#propertyEdit_name').text('Editing the "' + propName + '" property of the "' + table.Name + '" table');
	
	var optOutput = '';
	for (var i=0; i<property.length; i++) {
		var opt = property[i];
		optOutput += writeOptionForPropertyEdit(opt.Text, opt.Value);
	}
	$('#propertyEdit_options').html(optOutput);
	
	$('#tableEdit').hide();
	$('#propertyEdit').show();
}

function writeOptionForPropertyEdit(text, value) {
	var empty = text.trim() == '' ? ' empty' : '';
	return '<li class="option' + empty + '"><input type="text" value="' + text + '" placeholder="option value" /> (chance: ' + value + ')<div class="edit link">✎</div><div class="delete link">☠</div></li>';
}

function performRoll(tableDiv) {
	var num = tableDiv.index();
	var table = tables[num];
	var result = selectTable(table);
	$('#output').text(formatInstance(table, result));
}

$(function () {
	loadData();
	$('#tableList').on('click', '.roll.link', function () {
		performRoll($(this).closest('.table'));
	}).on('click', '.edit.link', function () {
		var num = $(this).closest('.table').index();
		showTableEdit(tables[num]);
	}).on('click', '.table', function () {
		if (!$('#displayRoot').hasClass('display'))
			return;
		performRoll($(this));
	});
	
	$('#tableEdit_text').change(function () {
		editTable.Text = $(this).val();
	});
	
	$('#tableEdit_properties').on('click', '.edit.link', function () {
		var propName = $(this).closest('.prop').attr('data-prop');
		showPropertyEdit(editTable, propName);
	}).on('click', '.delete.link', function () {
		var propName = $(this).closest('.prop').attr('data-prop');
		delete editTable.Properties[propName];
		showTableEdit(editTable);
	}).on('change', 'li input', function () {
		var li = $(this).closest('li');
		var val = $(this).val();
		
		li.toggleClass('empty', val.trim() == '');
		if (val.trim() != '') {
			var oldName = li.attr('data-prop'), prop;
			if (oldName === '')
				prop = [{Text: '', Value: 4}];
			else {
				prop = editTable.Properties[oldName];
				delete editTable.Properties[oldName];
			}
			
			editTable.Properties[val] = prop;
			li.attr('data-prop', val);
		}
	});
	
	$('#propertyEdit_options').on('click', 'li:not(.empty) .edit.link', function () {
		var optNum = $(this).closest('.option').index();
		var opt = editTable.Properties[editProp][optNum];
		showTableEdit(opt);
	}).on('click', '.delete.link', function () {
		var optNum = $(this).closest('.option').index();
		editTable.Properties[editProp].splice(optNum, 1);
		showPropertyEdit(editTable, editProp);
	}).on('change', 'li input:first-child', function () {
		var optNum = $(this).closest('.option').index();
		var text = $(this).val();
		editTable.Properties[editProp][optNum].Text = text;
		$(this).closest('li').toggleClass('empty', text.trim() == '');
	});
	
	$('#addTable').click(function () {
		var table = { Name: '', Text: '', "Properties": {} };
		tables.push(table);
		showTableEdit(table);
	});
	
	$('#tableEdit_addProp').click(function () {
		$('#tableEdit_properties').append(writePropertyForTableEdit(''));
		$('#tableEdit_properties > *').last().find('input').focus();
		return false;
	});
	
	$('#propertyEdit_addOpt').click(function () {
		$('#propertyEdit_options').append(writeOptionForPropertyEdit('', 4));
		editTable.Properties[editProp].push({Text: '', Value: 4});
		$('#propertyEdit_options > *').last().find('input').focus();
		return false;
	});
	
	$('#tableEdit_back').click(function () {
		if (editTable.Parent !== undefined)
			showTableEdit(editTable.Parent);
		else {
			$('#tableEdit').hide();
			listTables();
			$('#displayRoot').show();
			editTable = editProp = null;
		}
	});
	
	$('#propertyEdit_back').click(function () {
		showTableEdit(editTable);
	});
	
	$('#toggleMode').click(function () {
		$('#displayRoot').toggleClass('display');
	});
});