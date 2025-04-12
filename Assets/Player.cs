using System.Runtime.InteropServices.WindowsRuntime;
using UnityEngine;

public class player : MonoBehaviour
{
private Rigidbody2D rb;
private Animator anim;

[SerializeField] private float moveSpeed;

private float xInput;
public bool isRunning;

    private void Awake()
    {
     rb = GetComponent<Rigidbody2D>();
     anim = GetComponentInChildren<Animator>();
    }

    // Update is called once per frame
    void Update()
    {
        xInput = Input.GetAxisRaw("Horizontal");
        rb.linearVelocity = new Vector2(xInput * moveSpeed, rb.linearVelocityY);
        anim.SetBool("isRunning", isRunning);
    }
}
