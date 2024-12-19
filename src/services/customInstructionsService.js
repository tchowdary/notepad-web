const CUSTOM_INSTRUCTIONS_KEY = 'custom_instructions';

const customInstructionsStorage = {
  async getAllInstructions() {
    const storedInstructions = localStorage.getItem(CUSTOM_INSTRUCTIONS_KEY);
    return storedInstructions ? JSON.parse(storedInstructions) : [];
  },

  async saveInstruction(instruction) {
    const instructions = await this.getAllInstructions();
    const newInstruction = {
      id: instruction.id || Date.now().toString(),
      name: instruction.name,
      content: instruction.content,
      createdAt: instruction.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const existingIndex = instructions.findIndex(i => i.id === newInstruction.id);
    if (existingIndex !== -1) {
      instructions[existingIndex] = newInstruction;
    } else {
      instructions.unshift(newInstruction);
    }

    localStorage.setItem(CUSTOM_INSTRUCTIONS_KEY, JSON.stringify(instructions));
    return newInstruction;
  },

  async deleteInstruction(id) {
    const instructions = await this.getAllInstructions();
    const filteredInstructions = instructions.filter(i => i.id !== id);
    localStorage.setItem(CUSTOM_INSTRUCTIONS_KEY, JSON.stringify(filteredInstructions));
  }
};

export { customInstructionsStorage };
