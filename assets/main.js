window.addEventListener('load', initializeItemSpinners);

function initializeItemSpinners() {
  const lists = document.querySelectorAll('.crafting_recipe table.inputs ul');

  for (const list of lists) {
    const elements = list.querySelectorAll('li');
    if (elements.length > 1) {
      updateList(list, elements);
      list.classList.remove('alternatives');
      list.classList.add('alternatives-updating');
    }
  }
}

function scheduleListUpdate(list, elements) {
  setTimeout(() => updateList(list, elements), 1500);
}

function updateList(list, elements) {
  // Determine current index
  let selectedIndex = 0;
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    if (element.classList.contains('item-variant-selected')) {
      element.classList.remove('item-variant-selected');
      selectedIndex = i;
      break;
    }
  }

  // Activate new element
  selectedIndex = (selectedIndex + 1) % elements.length;
  elements[selectedIndex].classList.add('item-variant-selected');

  // Schedule a new update
  scheduleListUpdate(list, elements);
}
