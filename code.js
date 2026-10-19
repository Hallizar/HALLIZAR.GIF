figma.showUI(__html__, { width: 400, height: 650 });


function _0xa11(name) {
  const regex = /^(.*?)[\s_\-#\(\[]*(\d+)[\s_\-#\)\]]*$/;
  const match = name.match(regex);

  if (match) {
    return {
      base: match[1].trim(),
      index: parseInt(match[2], 10),
      hasNumber: true
    };
  } else {
    return {
      base: name.trim(),
      index: 0,
      hasNumber: false
    };
  }
}

async function _0xa12() {
  await figma.currentPage.loadAsync();
  const selection = figma.currentPage.selection;
  const nodesToScan = selection.length > 0 ? selection : figma.currentPage.children;
  const groups = {};

  nodesToScan.forEach(node => {
    if (node.type === "FRAME" || node.type === "COMPONENT" || node.type === "INSTANCE") {
      const { base, index } = _0xa11(node.name);
      
      const groupKey = `${base}::${node.width}x${node.height}`;

      if (!groups[groupKey]) {
        groups[groupKey] = {
          name: base,
          width: node.width,
          height: node.height,
          frames: []
        };
      }

      groups[groupKey].frames.push({
        id: node.id,
        name: node.name,
        index: index
      });
    }
  });

  const result = Object.keys(groups).map(key => {
    const group = groups[key];
    group.frames.sort((a, b) => a.index - b.index);
    return {
      id: key,
      name: group.name,
      info: `${group.width}x${group.height}`,
      frames: group.frames
    };
  }).filter(g => g.frames.length > 1);

  return result;
}

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'scan-layers') {
    const data = await _0xa12();
    figma.ui.postMessage({ type: 'scan-result', data });
  }

  if (msg.type === 'render-group') {
    const { groupId, frameIds, settingScale } = msg;
    const nodes = (await Promise.all(frameIds.map(id => figma.getNodeByIdAsync(id)))).filter(n => n);
    
    if (nodes.length === 0) {
      figma.notify("Error: Frames not found");
      return;
    }

    try {
      const framesData = [];
      for (const node of nodes) {
       
        const bytes = await node.exportAsync({
          format: 'PNG',
          constraint: { type: 'SCALE', value: settingScale || 1 }
        });
        framesData.push(bytes);
      }
      figma.ui.postMessage({ type: 'render-data', groupId, framesData });
    } catch (err) {
      figma.notify("Export failed: " + err.message);
    }
  }
};