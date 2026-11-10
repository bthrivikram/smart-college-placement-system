
from sentence_transformers import SentenceTransformer

# Load the pretrained embedding model
print("Loading all-MiniLM-L6-v2...")

model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

print("Model loaded successfully!")

# Sample resume and job description
resume_text = """
I am a computer science student with experience in Python,
machine learning, deep learning, SQL and data analysis.
I have developed projects using Scikit-learn and TensorFlow.
"""

job_description = """
We are looking for a software engineer with knowledge of Python,
machine learning, data analysis and database management.
Experience with deep learning frameworks is preferred.
"""

# Generate embeddings
resume_embedding = model.encode(resume_text)
job_embedding = model.encode(job_description)

# Display embedding information
print("\nResume embedding shape:", resume_embedding.shape)
print("Job embedding shape:", job_embedding.shape)

# Calculate cosine similarity
from sentence_transformers import util

similarity = util.cos_sim(resume_embedding, job_embedding)

print("\nSemantic similarity score:", round(similarity.item(), 4))
print("Similarity percentage:", round(similarity.item() * 100, 2), "%")
