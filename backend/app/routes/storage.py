from fastapi import APIRouter, Query
from typing import Optional, List
from app.services.aggregator import aggregator
from app.models.schemas import StorageResource

router = APIRouter(prefix="/api/storage", tags=["Storage"])

@router.get("", response_model=List[StorageResource])
def get_storage(provider: Optional[str] = Query(None, description="Filter by provider: aws, azure, or gcp")):
    """
    Returns object storage buckets and block storage disks across AWS (S3, EBS),
    Azure (Blob, Managed Disks), and GCP (Cloud Storage, Persistent Disks).
    """
    return aggregator.get_storage(provider=provider)
