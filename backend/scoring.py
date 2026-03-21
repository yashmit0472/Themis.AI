def get_scores(argument):
    speaking = f"Rate articulation and confidence (0-10): {argument}"
    logic = f"Rate logical consistency (0-10): {argument}"
    legal = f"Rate legal terminology usage (0-10): {argument}"

    return {
        "speaking": speaking,
        "logic": logic,
        "legal": legal
    }