import { ref, type Ref } from 'vue';
import { AdvancedDynamicTexture, Rectangle, TextBlock, Button, Control } from '@babylonjs/gui';
import type { Scene } from '@babylonjs/core';

export interface DebugInfo {
  webxrSupported: boolean;
  arActive: boolean;
  trackingInitialized: boolean;
  networkConnected: boolean;
  roomId: string | null;
  objectCount: number;
  lastError: string | null;
}

export function useARUI(scene: Ref<Scene | null>) {
  const advancedTexture = ref<AdvancedDynamicTexture | null>(null);
  const showDebug = ref(true);
  
  // UI elements
  const debugPanel = ref<Rectangle | null>(null);
  const statusBar = ref<Rectangle | null>(null);
  const centerInstruction = ref<Rectangle | null>(null);
  const controlsPanel = ref<Rectangle | null>(null);

  // Initialize GUI
  const initializeGUI = (): boolean => {
    if (!scene.value) {
      console.error('Scene not available for GUI');
      return false;
    }

    try {
      // Create fullscreen UI texture
      advancedTexture.value = AdvancedDynamicTexture.CreateFullscreenUI('ARUI', true, scene.value);
      
      // Create debug panel (top left)
      createDebugPanel();
      
      // Create status bar (top center)
      createStatusBar();
      
      // Create center instruction
      createCenterInstruction();
      
      // Create controls panel (bottom)
      createControlsPanel();
      
      return true;
    } catch (error) {
      console.error('Failed to initialize GUI:', error);
      return false;
    }
  };

  const createDebugPanel = () => {
    if (!advancedTexture.value) return;

    const panel = new Rectangle('debugPanel');
    panel.width = '240px';
    panel.height = 'auto';
    panel.cornerRadius = 6;
    panel.color = 'rgba(255,255,255,0.1)';
    panel.thickness = 1;
    panel.background = 'rgba(0,0,0,0.75)';
    panel.alpha = 0.95;
    panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    panel.left = '8px';
    panel.top = '8px';
    panel.adaptHeightToChildren = true;
    panel.paddingTop = '6px';
    panel.paddingBottom = '6px';
    panel.paddingLeft = '8px';
    panel.paddingRight = '8px';
    advancedTexture.value.addControl(panel);
    debugPanel.value = panel;

    // Header
    const header = new Rectangle('debugHeader');
    header.width = '100%';
    header.height = '30px';
    header.background = 'transparent';
    header.thickness = 0;
    header.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    panel.addControl(header);

    const headerText = new TextBlock('debugHeaderText', 'DEBUG');
    headerText.color = 'white';
    headerText.fontSize = 11;
    headerText.fontWeight = 'bold';
    headerText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    header.addControl(headerText);

    const toggleBtn = Button.CreateSimpleButton('debugToggle', '▼');
    toggleBtn.width = '24px';
    toggleBtn.height = '20px';
    toggleBtn.color = 'white';
    toggleBtn.fontSize = 10;
    toggleBtn.background = 'rgba(255,255,255,0.15)';
    toggleBtn.cornerRadius = 3;
    toggleBtn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    toggleBtn.onPointerClickObservable.add(() => {
      showDebug.value = !showDebug.value;
      toggleBtn.textBlock!.text = showDebug.value ? '▼' : '▲';
      updateDebugContent();
    });
    header.addControl(toggleBtn);

    // Debug content container
    const contentContainer = new Rectangle('debugContent');
    contentContainer.width = '100%';
    contentContainer.height = 'auto';
    contentContainer.background = 'transparent';
    contentContainer.thickness = 0;
    contentContainer.adaptHeightToChildren = true;
    panel.addControl(contentContainer);
    updateDebugContent();
  };

  const createStatusBar = () => {
    if (!advancedTexture.value) return;

    const bar = new Rectangle('statusBar');
    bar.width = '200px';
    bar.height = 'auto';
    bar.cornerRadius = 6;
    bar.color = 'rgba(255,255,255,0.1)';
    bar.thickness = 1;
    bar.background = 'rgba(0,0,0,0.75)';
    bar.alpha = 0.95;
    bar.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    bar.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    bar.left = '-208px'; // Negative left for right alignment (width + padding + margin)
    bar.top = '8px';
    bar.adaptHeightToChildren = true;
    bar.paddingTop = '8px';
    bar.paddingBottom = '8px';
    bar.paddingLeft = '12px';
    bar.paddingRight = '12px';
    advancedTexture.value.addControl(bar);
    statusBar.value = bar;
  };

  const createCenterInstruction = () => {
    if (!advancedTexture.value) return;

    const instruction = new Rectangle('centerInstruction');
    instruction.width = '400px';
    instruction.height = 'auto';
    instruction.cornerRadius = 16;
    instruction.color = 'rgba(255,255,255,0.2)';
    instruction.thickness = 2;
    instruction.background = '#000000';
    instruction.alpha = 0.8;
    instruction.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    instruction.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    instruction.adaptHeightToChildren = true;
    instruction.paddingTop = '24px';
    instruction.paddingBottom = '24px';
    instruction.paddingLeft = '32px';
    instruction.paddingRight = '32px';
    instruction.isVisible = false;
    advancedTexture.value.addControl(instruction);
    centerInstruction.value = instruction;
  };

  const createControlsPanel = () => {
    if (!advancedTexture.value) return;

    const panel = new Rectangle('controlsPanel');
    panel.width = '0px'; // Will adapt to children
    panel.height = 'auto';
    panel.cornerRadius = 8;
    panel.color = 'rgba(255,255,255,0.1)';
    panel.thickness = 1;
    panel.background = 'rgba(0,0,0,0.75)';
    panel.alpha = 0.95;
    panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    panel.top = '-100px'; // Negative top for bottom alignment (will adapt to content)
    panel.adaptWidthToChildren = true;
    panel.adaptHeightToChildren = true;
    panel.paddingTop = '12px';
    panel.paddingBottom = '12px';
    panel.paddingLeft = '16px';
    panel.paddingRight = '16px';
    advancedTexture.value.addControl(panel);
    controlsPanel.value = panel;
  };

  const updateDebugContent = () => {
    if (!debugPanel.value || !showDebug.value) {
      const content = advancedTexture.value?.getControlByName('debugContent') as Rectangle;
      if (content) {
        content.isVisible = showDebug.value;
      }
      return;
    }

    const content = advancedTexture.value?.getControlByName('debugContent') as Rectangle;
    if (!content) return;

    // Clear existing content
    Array.from(content.children).forEach((child) => {
      if (child.name !== 'debugHeader') {
        content.removeControl(child as Control);
      }
    });
    content.isVisible = true;
  };

  const updateDebugInfo = (info: DebugInfo) => {
    if (!debugPanel.value || !showDebug.value) return;

    const content = advancedTexture.value?.getControlByName('debugContent') as Rectangle;
    if (!content) return;

    // Clear and recreate debug lines
    Array.from(content.children).forEach((child) => {
      if (child.name?.startsWith('debugLine')) {
        content.removeControl(child as Control);
      }
    });

    const createDebugLine = (label: string, value: string, color: string = 'white') => {
      const line = new Rectangle(`debugLine_${label}`);
      line.width = '100%';
      line.height = '18px';
      line.background = 'transparent';
      line.thickness = 0;
      line.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
      line.paddingBottom = '2px';
      content.addControl(line);

      const labelText = new TextBlock(`debugLabel_${label}`, label + ':');
      labelText.color = 'rgba(255,255,255,0.7)';
      labelText.fontSize = 10;
      labelText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
      labelText.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
      labelText.width = '100px';
      line.addControl(labelText);

      const valueText = new TextBlock(`debugValue_${label}`, value);
      valueText.color = color;
      valueText.fontSize = 10;
      valueText.fontWeight = '600';
      valueText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
      valueText.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
      valueText.width = '120px';
      line.addControl(valueText);
    };

    createDebugLine('WebXR', info.webxrSupported ? 'Supported' : 'Not Supported', info.webxrSupported ? '#4ade80' : '#f87171');
    createDebugLine('AR Session', info.arActive ? 'Active' : 'Inactive', info.arActive ? '#4ade80' : '#fbbf24');
    createDebugLine('Image Tracking', info.trackingInitialized ? 'Init' : 'Not Init', info.trackingInitialized ? '#4ade80' : '#fbbf24');
    createDebugLine('Network', info.networkConnected ? 'Connected' : 'Disconnected', info.networkConnected ? '#4ade80' : '#f87171');
    createDebugLine('Room', info.roomId || 'None', 'white');
    createDebugLine('Objects', info.objectCount.toString(), 'white');
    
    if (info.lastError) {
      createDebugLine('Error', info.lastError, '#f87171');
    }
  };

  const updateStatusBar = (roomId: string, participantCount: number, anchorFound: boolean) => {
    if (!statusBar.value) return;

    // Clear existing content
    Array.from(statusBar.value.children).forEach((child) => {
      statusBar.value!.removeControl(child as Control);
    });

    const createStatusItem = (label: string, value: string, color: string = 'white') => {
      const item = new Rectangle(`statusItem_${label}`);
      item.width = '100%';
      item.height = 'auto';
      item.background = 'transparent';
      item.thickness = 0;
      item.adaptHeightToChildren = true;
      item.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
      item.paddingBottom = '4px';
      statusBar.value!.addControl(item);

      const labelText = new TextBlock(`statusLabel_${label}`, label.toUpperCase());
      labelText.color = 'rgba(255,255,255,0.7)';
      labelText.fontSize = 9;
      labelText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
      labelText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
      item.addControl(labelText);

      const valueText = new TextBlock(`statusValue_${label}`, value);
      valueText.color = color;
      valueText.fontSize = 12;
      valueText.fontWeight = '600';
      valueText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
      valueText.top = '12px';
      item.addControl(valueText);
    };

    createStatusItem('Room', roomId);
    createStatusItem('Participants', participantCount.toString());
    createStatusItem('Anchor', anchorFound ? 'Found' : 'Not Found', anchorFound ? '#4ade80' : '#fbbf24');
  };

  const showCenterInstruction = (show: boolean, message?: string) => {
    if (!centerInstruction.value) return;
    
    centerInstruction.value.isVisible = show;
    
    if (show && message) {
      // Clear existing content
      Array.from(centerInstruction.value.children).forEach((child) => {
        centerInstruction.value!.removeControl(child as Control);
      });

      const title = new TextBlock('instructionTitle', 'Scan QR Code');
      title.color = 'white';
      title.fontSize = 20;
      title.fontWeight = 'bold';
      title.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
      title.paddingBottom = '8px';
      centerInstruction.value.addControl(title);

      const desc = new TextBlock('instructionDesc', message || 'Point your device at the QR marker to anchor the AR experience');
      desc.color = 'rgba(255,255,255,0.85)';
      desc.fontSize = 14;
      desc.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
      centerInstruction.value.addControl(desc);
    }
  };

  const createButton = (name: string, text: string, onClick: () => void, color: string = '#667eea', enabled: boolean = true): Button => {
    const button = Button.CreateSimpleButton(name, text);
    button.width = '100px';
    button.height = '44px';
    button.color = 'white';
    button.fontSize = 13;
    button.fontWeight = '600';
    button.background = color;
    button.cornerRadius = 6;
    button.alpha = enabled ? 1 : 0.5;
    button.isEnabled = enabled;
    button.paddingLeft = '8px';
    button.paddingRight = '8px';
    button.thickness = 0;
    button.onPointerClickObservable.add(() => {
      if (enabled) {
        onClick();
      }
    });
    return button;
  };

  const updateControls = (onPlaceObject: () => void, onExitAR: () => void, onFocusCamera: () => void, anchorFound: boolean) => {
    if (!controlsPanel.value) return;

    // Clear existing buttons
    Array.from(controlsPanel.value.children).forEach((child) => {
      controlsPanel.value!.removeControl(child as Control);
    });

    const focusBtn = createButton('focusBtn', 'Focus', onFocusCamera, '#22c55e', true);
    focusBtn.paddingRight = '12px';
    controlsPanel.value.addControl(focusBtn);

    const placeBtn = createButton('placeBtn', 'Place', onPlaceObject, '#667eea', anchorFound);
    placeBtn.paddingLeft = '12px';
    placeBtn.paddingRight = '12px';
    controlsPanel.value.addControl(placeBtn);

    const exitBtn = createButton('exitBtn', 'Exit', onExitAR, '#ef4444', true);
    exitBtn.paddingLeft = '12px';
    controlsPanel.value.addControl(exitBtn);
  };

  const dispose = () => {
    if (advancedTexture.value) {
      advancedTexture.value.dispose();
      advancedTexture.value = null;
    }
    debugPanel.value = null;
    statusBar.value = null;
    centerInstruction.value = null;
    controlsPanel.value = null;
  };

  return {
    initializeGUI,
    updateDebugInfo,
    updateStatusBar,
    showCenterInstruction,
    updateControls,
    dispose,
  };
}

