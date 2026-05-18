from rag_pipeline import process_pdf, ask_question

# Use any small PDF you have on your computer
chain = process_pdf("test.pdf")

answer = ask_question(chain, "What is this document about?")
print(answer)