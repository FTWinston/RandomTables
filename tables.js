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
	
	numValues = -1;
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
		output += '<div class="table">' + table.Name + '<div class="roll link" tabindex="0">⚄</div><div class="edit link" tabindex="0">✎</div><div class="delete link" tabindex="0">☠</div></div>';
	}
	document.getElementById('tableList').innerHTML = output;
}

var tables, editTable, editProp;
function loadData(url) {
	url = url.replace('gist.github.com', 'gist.githubusercontent.com');
	
	if (url.indexOf('gist.githubusercontent.com') != -1 ) {
		if (url.charAt(url.length - 1) != '/');
			url += '/';
		
		var suffix = 'raw/';
		if (url.substr(-suffix.length) !== suffix)
			url += 'raw';
	}
	
	if (url.indexOf('://') == -1) {
		url = 'http://' + url;
	}
	
	$.getJSON(url, '', function (data) {
		addLinks(data);
		tables = data;
		listTables();
		$('#intro').hide();
		$('#displayRoot').show();
	});
}

function saveData() {
	var json = JSON.stringify(tables, function (key,value) {
		if (key == 'Parent')
			return undefined;
		return value;
	}, '	');
	
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
	
	if (table.Properties === undefined)
		table.Properties = {};
	
	var propOutput = '';
	for (var prop in table.Properties) {
		propOutput += writePropertyForTableEdit(prop);
	}
	if(propOutput == '')
		propOutput += writePropertyForTableEdit('');
	
	$('#tableEdit_properties').html(propOutput);
	
	$('#propertyEdit').hide();
	$('#tableEdit').show();
}

function writePropertyForTableEdit(prop) {
	var empty = prop.trim() == '' ? ' empty' : '';
	return '<li class="prop' + empty + '" data-prop="' + prop + '"><input type="text" value="' + prop + '" placeholder="property name" class="text" /><div class="edit link" tabindex="0">✎</div><div class="delete link" tabindex="0">☠</div></li>';
}

function showPropertyEdit(table, propName) {
	$('#displayRoot').hide();
	editTable = table;
	editProp = propName;
	var property = table.Properties[propName];
	
	var tableName = table.Name;
	if (tableName === undefined)
		tableName = table.Text;
	
	$('#propertyEdit_name').text('Editing the "' + propName + '" property of the "' + tableName + '" table. Numbers will control how common a particular option is, and the ✎ icon will turn an option into a (sub) table in its own right.');
	
	var optOutput = '';
	for (var i=0; i<property.length; i++) {
		var opt = property[i];
		optOutput += writeOptionForPropertyEdit(opt.Text, opt.Value, i, opt.Properties !== undefined);
	}
	$('#propertyEdit_options').html(optOutput);
	$('#tableEdit').hide();
	$('#propertyEdit').show();
}

function writeOptionForPropertyEdit(text, value, num, isTable) {
	var classes = text.trim() == '' ? ' empty' : '';
	if (isTable)
		classes += ' table';
	
	var output = '<li class="option' + classes + '"><input type="text" value="' + text + '" placeholder="option value" class="text" /><span class="optionValues">';
	
	for (var i=1; i<=10; i++) {
		var id = 'opt' + num + '_' + i;
		output += '<input type="radio" id="' + id + '" name="opt' + num + '" value="' + i + '" ';
		if (value == i)
			output += 'checked ';
		output += '/><label for="' + id + '">' + i + '</label>';
	}
	output += '<input type="text" id="opt' + num + '_other" class="number" placeholder="other" tabindex="-1" ';
	if (value > 10)
		output += 'value="' + value + '" ';
	output += '/></span><div class="edit link" tabindex="0">✎</div><div class="delete link" tabindex="0">☠</div></li>';
	return output;
}

function performRoll(tableDiv) {
	var num = tableDiv.index();
	var table = tables[num];
	var result = selectTable(table);
	$('#output').text(formatInstance(table, result));
}

function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

$(function () {
	$('#loadUrl').click(function () {
		var url = $('#dataUrl').val();
		loadData(url);
		return false;
	});
	
	$('#saveTables').click(function () {
		saveData();
		return false;
	});
	
	$('#closeTables').click(function () {
		if (!confirm('Discard all changes?'))
			return false;
		
		var pos = document.location.href.indexOf('?');
		if (pos == -1)
			document.location.reload();
		else
			document.location.href = document.location.href.substr(0, pos);
		return false;
	});
	
	$('#tableList').on('click', '.roll.link', function () {
		performRoll($(this).closest('.table'));
		return false;
	}).on('click', '.edit.link', function () {
		var num = $(this).closest('.table').index();
		showTableEdit(tables[num]);
		return false;
	})
	.on('click', '.delete.link', function () {
		var num = $(this).closest('.table').index();
		if (!confirm('Remove the "' + tables[num].Name + '" table?'))
			return false;
		tables.splice(num, 1);
		listTables();
		return false;
	}).on('click', '.table', function () {
		if (!$('#displayRoot').hasClass('display'))
			return;
		performRoll($(this));
		return false;
	});
	
	$('#tableEdit_name').change(function () {
		editTable.Name = $(this).val().trim();
	});
	
	$('#tableEdit_text').change(function () {
		var val = $(this).val().trim();
		if (val == '')
			delete editTable.Text;
		else
			editTable.Text = val;
	});
	
	$('#tableEdit_properties').on('click', '.edit.link', function () {
		var propName = $(this).closest('.prop').attr('data-prop');
		showPropertyEdit(editTable, propName);
		return false;
	}).on('click', '.delete.link', function () {
		var propName = $(this).closest('.prop').attr('data-prop');
		if (propName != '' && !confirm('Remove the "' + propName + '" property?'))
			return false;
		delete editTable.Properties[propName];
		showTableEdit(editTable);
		return false;
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
		var option = $(this).closest('.option');
		var name = option.find('input.text').val();
		if (!option.hasClass('table') && !confirm('Convert the "' + name + '" option into a table?'))
			return false;
		
		var optNum = option.index();
		var opt = editTable.Properties[editProp][optNum];
		opt.Parent = editTable;
		showTableEdit(opt);
		return false;
	}).on('click', '.delete.link', function () {
		var option = $(this).closest('.option');
		var name = option.find('input.text').val();
		if (name != '' && !confirm('Remove the "' + name + '" option?'))
			return false;
		
		var optNum = option.index();
		editTable.Properties[editProp].splice(optNum, 1);
		showPropertyEdit(editTable, editProp);
		return false;
	}).on('change', 'li input.text', function () {
		var optNum = $(this).closest('.option').index();
		var text = $(this).val();
		editTable.Properties[editProp][optNum].Text = text;
		$(this).closest('li').toggleClass('empty', text.trim() == '');
	}).on('change', '.optionValues input', function () {
		if ($(this).attr('type') == 'radio') {
			if (!$(this).prop('checked'))
				return;
			
			$(this).siblings('input.number').val('');
		}
		else {
			$(this).siblings('input[type="radio"]').prop('checked', false);
		}
		
		var optNum = $(this).closest('.option').index();
		editTable.Properties[editProp][optNum].Value = $(this).val().toString();
	}).on('keypress', 'li input.number', function (e) {
		return (e.which >= 48 && e.which <= 57) || e.which < 31;
	});
	
	$('#addTable, #createNew').click(function () {
		if (tables === undefined)
			tables = [];
		
		var table = { Name: '', Text: '', "Properties": {} };
		tables.push(table);
		$('#intro').hide();
		showTableEdit(table);
		return false;
	});
	
	$('#tableEdit_addProp').click(function () {
		$('#tableEdit_properties').append(writePropertyForTableEdit(''));
		$('#tableEdit_properties > *').last().find('input').focus();
		return false;
	});
	
	$('#propertyEdit_addOpt').click(function () {
		var prop = editTable.Properties[editProp];
		$('#propertyEdit_options').append(writeOptionForPropertyEdit('', 4, prop.length + 1, false));
		prop.push({Text: '', Value: 4});
		$('#propertyEdit_options > *').last().find('input').first().focus();
		return false;
	});
	
	$('#tableEdit_back').click(function () {
		if (editTable.Parent !== undefined) {
			if (editProp !== null)
				showPropertyEdit(editTable.Parent, editProp);
			else
				showTableEdit(editTable.Parent);
		}
		else {
			listTables();
			$('#tableEdit').hide();
			$('#displayRoot').show();
			editTable = editProp = null;
		}
		return false;
	});
	
	$('#propertyEdit_back').click(function () {
		editProp = null;
		showTableEdit(editTable);
		return false;
	});
	
	$('#toggleMode').click(function () {
		$('#displayRoot').toggleClass('display');
		return false;
	});
	
	$('#tableList, #tableEdit, #propertyEdit').on('keypress', '.link:focus', function(e) {
		if (e.keyCode == 13)
			$(this).click();
	});
	
	$('#tableEdit_properties, #propertyEdit_options').on('keypress', 'input.text', function(e) {
		if (e.keyCode == 13 && !moveDown(this))
			$(this).closest('ul').next('a.addNew').click();
	});
	
	$('#tableEdit_properties, #propertyEdit_options').on('keyup', 'input.text', function(e) {
		if (e.keyCode == 40)
			moveDown(this);
		else if (e.keyCode == 38)
			moveUp(this);
	});
	
	function moveDown(fromElement) {
		var to = $(fromElement).closest('li').next('li').find('input.text').first();
		if (to.length == 0)
			return false;
		
		to.focus().select();
		return true;
	}
	
	function moveUp(fromElement) {
		var to = $(fromElement).closest('li').prev('li').find('input.text').first();
		if (to.length == 0)
			return false;
		
		to.focus().select();
		return true;
	}
	
	var queryUrl = getParameterByName('source');
	if (queryUrl != null)
		loadData(queryUrl);
});